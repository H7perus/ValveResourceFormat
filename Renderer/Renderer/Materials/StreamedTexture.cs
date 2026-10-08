using System.Buffers;
using System.Diagnostics;
using System.Threading;
using ValveResourceFormat.Renderer.RHI;
using Vortice.Vulkan;
using VrfTexture = ValveResourceFormat.ResourceTypes.Texture;

namespace ValveResourceFormat.Renderer.Materials
{
    /// <summary>The size of one mip as it is read and as it is uploaded.</summary>
    /// <param name="Width">Width in texels.</param>
    /// <param name="Height">Height in texels.</param>
    /// <param name="DepthOrLayers">Depth for volume textures, the layer count otherwise, counting cube faces.</param>
    /// <param name="SourceSize">Bytes read from the resource.</param>
    /// <param name="StagingSize">Bytes uploaded, which differs from <paramref name="SourceSize"/> when the mip is decoded first.</param>
    internal readonly record struct StreamedMip(int Width, int Height, int DepthOrLayers, int SourceSize, int StagingSize);

    /// <summary>
    /// A texture whose mips are being read and uploaded, smallest first. Runs on the thread pool for the uploads,
    /// with one upload out at a time, so the fields describing it are only touched by one thread at once.
    /// </summary>
    internal sealed class StreamedTexture : IThreadPoolWorkItem
    {
        public TextureStreamingHelper Streaming { get; }
        public RHI.Texture Texture { get; }
        public string Name { get; }

        /// <summary>The resource the mips are read from, null when they come from <see cref="Pixels"/>.</summary>
        public VrfTexture? Data { get; }

        /// <summary>A single mip already in the texture's format, covering every layer.</summary>
        public byte[]? Pixels { get; }

        /// <summary>Whether mips are decoded to RGBA8, for formats the device cannot sample in this shape.</summary>
        public bool DecodeToRgba8 { get; }

        /// <summary>The resource mip that is the texture's mip 0, above zero when the largest mips are skipped.</summary>
        public int MinMipLevelAllowed { get; }

        /// <summary>Every mip of the texture, indexed by the texture's own mip level.</summary>
        public StreamedMip[] Mips { get; }

        /// <summary>The next mip to read. Everything less detailed has been read or is being read.</summary>
        public int NextMip { get; set; }

        // The mips the request in flight reads, from RequestLastMip down to RequestFirstMip
        public int RequestFirstMip { get; private set; }
        public int RequestLastMip { get; private set; }
        public long RequestBytes { get; private set; }

        public StreamedTexture(TextureStreamingHelper streaming, RHI.Texture texture, string name, VrfTexture data, int minMipLevelAllowed, bool decodeToRgba8)
        {
            Streaming = streaming;
            Texture = texture;
            Name = name;
            Data = data;
            MinMipLevelAllowed = minMipLevelAllowed;
            DecodeToRgba8 = decodeToRgba8;
            Mips = new StreamedMip[texture.MipLevels];

            foreach (var (level, width, height, depth, bufferSize) in data.GetEveryMipLevelMetrics())
            {
                var mip = (int)level - minMipLevelAllowed;

                if (mip >= 0)
                {
                    Mips[mip] = new StreamedMip(width, height, depth, bufferSize, decodeToRgba8 ? width * height * depth * 4 : bufferSize);
                }
            }

            NextMip = Mips.Length - 1;
        }

        public StreamedTexture(TextureStreamingHelper streaming, RHI.Texture texture, string name, byte[] pixels)
        {
            Debug.Assert(texture.MipLevels == 1);

            Streaming = streaming;
            Texture = texture;
            Name = name;
            Pixels = pixels;

            var depthOrLayers = texture.Dimension == TextureDimension.Texture3D ? texture.Depth : texture.ArrayLayers;
            Mips = [new StreamedMip((int)texture.Width, (int)texture.Height, (int)depthOrLayers, pixels.Length, pixels.Length)];
        }

        /// <summary>Copy regions must start on a multiple of the texel block size, which is at most 16 bytes.</summary>
        public static long AlignStagingOffset(long offset) => (offset + 15) & ~15L;

        /// <summary>
        /// Picks the mips the next request reads: from <see cref="NextMip"/> towards mip 0 while they fit the
        /// budget, and always at least one, or a mip bigger than the budget would never be read.
        /// </summary>
        public void PlanRequest(long budget)
        {
            var bytes = 0L;
            var mip = NextMip;

            while (mip >= 0)
            {
                var size = AlignStagingOffset(Mips[mip].StagingSize);

                if (mip != NextMip && bytes + size > budget)
                {
                    break;
                }

                bytes += size;
                mip--;
            }

            RequestLastMip = NextMip;
            RequestFirstMip = mip + 1;
            RequestBytes = bytes;
        }

        /// <summary>Reads one mip, decoded if needed, into memory the size of its <see cref="StreamedMip.StagingSize"/>.</summary>
        public void ReadMip(int mip, Span<byte> destination)
        {
            if (Pixels != null)
            {
                Pixels.CopyTo(destination);
                return;
            }

            Debug.Assert(Data != null);

            var info = Mips[mip];
            var level = (uint)(mip + MinMipLevelAllowed);

            if (!DecodeToRgba8)
            {
                // The resource reader is shared with anything else reading this texture
                lock (Data)
                {
                    Data.ReadTextureMipLevel(destination, level);
                }

                return;
            }

            var compressed = ArrayPool<byte>.Shared.Rent(info.SourceSize);

            try
            {
                lock (Data)
                {
                    Data.ReadTextureMipLevel(compressed.AsSpan(0, info.SourceSize), level);
                }

                Data.DecodeTexture(compressed.AsSpan(0, info.SourceSize), destination, info.Width, info.Height, info.DepthOrLayers);
            }
            finally
            {
                ArrayPool<byte>.Shared.Return(compressed);
            }
        }

        /// <summary>Describes where one mip lands in the texture.</summary>
        public VkBufferImageCopy CreateCopyRegion(int mip, ulong stagingOffset)
        {
            var info = Mips[mip];
            var isVolume = Texture.Dimension == TextureDimension.Texture3D;

            return new VkBufferImageCopy
            {
                bufferOffset = stagingOffset,

                // Tightly packed, block compressed rows included
                bufferRowLength = 0,
                bufferImageHeight = 0,

                imageSubresource = new VkImageSubresourceLayers
                {
                    aspectMask = VkImageAspectFlags.Color,
                    mipLevel = (uint)mip,
                    baseArrayLayer = 0,
                    layerCount = isVolume ? 1 : Texture.ArrayLayers,
                },
                imageOffset = default,
                imageExtent = new VkExtent3D((uint)info.Width, (uint)info.Height, isVolume ? (uint)info.DepthOrLayers : 1),
            };
        }

        /// <inheritdoc/>
        public void Execute() => Streaming.RunUpload(this);
    }
}
