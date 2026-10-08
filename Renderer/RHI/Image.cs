using System;
using System.Collections.Generic;
using System.Text;
using Vortice.Vulkan;

using static Vortice.Vulkan.Vma;
using static Vortice.Vulkan.Vulkan;
using static ValveResourceFormat.Renderer.RHI.S2vDevice;

namespace ValveResourceFormat.Renderer.RHI
{
    public class Image : IResource
    {
        public VkImage ImageHandle { get; private set; }
        public VkImageView ImageViewHandle { get; private set; }

        //Can be null as swapchain images.
        public VmaAllocation? VmaAllocation { get; private set; }

        public VkFormat Format { get; init; }

        /// <summary>The image shape, which decides the view type shaders access it through.</summary>
        public TextureDimension Dimension { get; }

        // Barriers transition every array layer of a mip together, so layouts are only tracked per mip
        public VkImageLayout[] MipLayouts { get; internal set; }

        /// <summary>Number of mip levels.</summary>
        public uint MipLevels => (uint)MipLayouts.Length;

        public uint Width { get; internal set; }
        public uint Height { get; internal set; }

        /// <summary>Depth in texels, 1 unless this is a <see cref="TextureDimension.Texture3D"/>.</summary>
        public uint Depth { get; internal set; }

        /// <summary>Vulkan array layer count, which counts each cube face as a layer.</summary>
        public uint ArrayLayers { get; internal set; }

        public uint SampleCount { get; internal set; }

        /// <summary>Creates an image and a view covering all of its mips and layers.</summary>
        /// <param name="width">Width in texels.</param>
        /// <param name="height">Height in texels, must be 1 for one dimensional images.</param>
        /// <param name="format">Texel format.</param>
        /// <param name="mipLevels">Number of mip levels.</param>
        /// <param name="sampleCount">Samples per texel, only valid above 1 for single mip 2D images and 2D arrays.</param>
        /// <param name="imageUsage">How the image will be used.</param>
        /// <param name="dimension">The image shape.</param>
        /// <param name="depthOrArraySize">Depth in texels for 3D images, the layer count for arrays,
        /// and the number of cubes (not faces) for cube arrays. Must be 1 for everything else.</param>
        public unsafe Image(uint width, uint height, VkFormat format, uint mipLevels = 1, uint sampleCount = 1, VkImageUsageFlags imageUsage = VkImageUsageFlags.ColorAttachment,
            TextureDimension dimension = TextureDimension.Texture2D, uint depthOrArraySize = 1)
        {
            Validate(width, height, mipLevels, sampleCount, dimension, depthOrArraySize);

            var (imageType, viewType) = GetImageTypes(dimension);
            var isCube = IsCube(dimension);

            Format = format;
            Dimension = dimension;
            MipLayouts = new VkImageLayout[mipLevels];
            Array.Fill(MipLayouts, VkImageLayout.Undefined);

            Width = width;
            Height = height;
            Depth = dimension == TextureDimension.Texture3D ? depthOrArraySize : 1;
            ArrayLayers = dimension switch
            {
                TextureDimension.Texture3D => 1,
                TextureDimension.TextureCube or TextureDimension.TextureCubeArray => depthOrArraySize * 6,
                _ => depthOrArraySize,
            };
            SampleCount = sampleCount;

            // Exclusive, as concurrent sharing can disable compression on some GPUs. Images written on the
            // transfer queue are handed over to the graphics family with a release and acquire barrier pair.
            VkImageCreateInfo imageInfo = new()
            {
                sType = VkStructureType.ImageCreateInfo,
                flags = isCube ? VkImageCreateFlags.CubeCompatible : VkImageCreateFlags.None,
                imageType = imageType,
                format = Format,
                extent = new VkExtent3D(Width, Height, Depth),
                mipLevels = mipLevels,
                arrayLayers = ArrayLayers,
                samples = (VkSampleCountFlags)SampleCount,
                tiling = VkImageTiling.Optimal,

                usage = imageUsage,

                sharingMode = VkSharingMode.Exclusive,
                initialLayout = VkImageLayout.Undefined
            };

            VmaAllocationCreateInfo allocationCreateInfo = new()
            {
                usage = VmaMemoryUsage.AutoPreferDevice,
            };

            VkResult result = vmaCreateImage(RenderDevice!.VmaAllocator, imageInfo, allocationCreateInfo, out var image, out var allocation);

            // Not every format supports every dimension, block compressed 3D images in particular are optional
            if (result != VkResult.Success)
            {
                throw new InvalidOperationException($"Failed to create {Dimension} image {Width}x{Height}x{Depth} ({ArrayLayers} layers) with format {Format}: {result}");
            }

            ImageHandle = image;
            VmaAllocation = allocation;

            // Determine aspect mask based on format
            VkImageAspectFlags aspectMask = Format switch
            {
                VkFormat.D16UnormS8Uint or VkFormat.D24UnormS8Uint or VkFormat.D32SfloatS8Uint => VkImageAspectFlags.Depth | VkImageAspectFlags.Stencil,
                VkFormat.D16Unorm or VkFormat.D32Sfloat => VkImageAspectFlags.Depth,
                _ => VkImageAspectFlags.Color
            };

            var imageViewInfo = new VkImageViewCreateInfo
            {
                image = ImageHandle,
                viewType = viewType,
                format = Format,
                components = VkComponentMapping.Rgba,
                subresourceRange = new VkImageSubresourceRange { baseMipLevel = 0, aspectMask = aspectMask, levelCount = mipLevels, layerCount = ArrayLayers, baseArrayLayer = 0 }
            };

            RenderDevice!.VkDeviceApi.vkCreateImageView(imageViewInfo, out var viewHandle);

            ImageViewHandle = viewHandle;
        }

        //When used as swapchain image
        internal Image(VkImage image, VkImageView imageView, uint width, uint height,  VkFormat format)
        {
            ImageHandle = image;
            ImageViewHandle = imageView;

            Format = format;
            Dimension = TextureDimension.Texture2D;
            MipLayouts = [VkImageLayout.Undefined];

            Width = width;
            Height = height;
            Depth = 1;
            ArrayLayers = 1;
            SampleCount = 1;
        }

        /// <summary>Gets the Vulkan image and view types for an image shape.</summary>
        /// <param name="dimension">The image shape.</param>
        internal static (VkImageType ImageType, VkImageViewType ViewType) GetImageTypes(TextureDimension dimension) => dimension switch
        {
            TextureDimension.Texture1D => (VkImageType.Image1D, VkImageViewType.Image1D),
            TextureDimension.Texture1DArray => (VkImageType.Image1D, VkImageViewType.Image1DArray),
            TextureDimension.Texture2D => (VkImageType.Image2D, VkImageViewType.Image2D),
            TextureDimension.Texture2DArray => (VkImageType.Image2D, VkImageViewType.Image2DArray),
            TextureDimension.Texture3D => (VkImageType.Image3D, VkImageViewType.Image3D),
            TextureDimension.TextureCube => (VkImageType.Image2D, VkImageViewType.ImageCube),
            TextureDimension.TextureCubeArray => (VkImageType.Image2D, VkImageViewType.ImageCubeArray),
            _ => throw new ArgumentException($"{dimension} is not an image dimension.", nameof(dimension)),
        };

        /// <summary>Gets whether an image shape is a cube or cube array, which are stored as six layers per cube.</summary>
        /// <param name="dimension">The image shape.</param>
        internal static bool IsCube(TextureDimension dimension) => dimension is TextureDimension.TextureCube or TextureDimension.TextureCubeArray;

        private static void Validate(uint width, uint height, uint mipLevels, uint sampleCount, TextureDimension dimension, uint depthOrArraySize)
        {
            if (width == 0 || height == 0 || depthOrArraySize == 0 || mipLevels == 0)
            {
                throw new ArgumentException("Image sizes and mip count must be at least 1.");
            }

            if (!BitOperations.IsPow2(sampleCount) || sampleCount > 64)
            {
                throw new ArgumentException("sampleCount does not fit 2^n or is out of bounds!", nameof(sampleCount));
            }

            if (sampleCount > 1 && (dimension is not (TextureDimension.Texture2D or TextureDimension.Texture2DArray) || mipLevels > 1))
            {
                throw new ArgumentException("Multisampling requires a single mip 2D image or 2D array.", nameof(sampleCount));
            }

            if (dimension is TextureDimension.Texture1D or TextureDimension.Texture1DArray && height != 1)
            {
                throw new ArgumentException("One dimensional images must have a height of 1.", nameof(height));
            }

            if (dimension is TextureDimension.TextureCube or TextureDimension.TextureCubeArray && width != height)
            {
                throw new ArgumentException("Cube faces must be square.", nameof(height));
            }

            if (dimension is TextureDimension.Texture1D or TextureDimension.Texture2D or TextureDimension.TextureCube && depthOrArraySize != 1)
            {
                throw new ArgumentException($"{dimension} images must have a depthOrArraySize of 1.", nameof(depthOrArraySize));
            }
        }

        /// <summary>Gets a view of a single mip level covering all layers, for example to write it as a storage image.</summary>
        /// <param name="mipLevel">The mip level to view.</param>
        // VKTODO: Create on first request, cache, and destroy in Destroy(). Calling it at load time doubles as upfront creation.
        public VkImageView GetMipView(uint mipLevel) => throw new NotImplementedException();

        /// <summary>Gets a 2D view of a single array layer or cube face covering all mips.</summary>
        /// <param name="layer">The array layer to view, counting each cube face as a layer.</param>
        // VKTODO: Same caching as GetMipView. 3D images have no layers, a 2D view of a slice needs VK_EXT_image_2d_view_of_3d.
        public VkImageView GetLayerView(uint layer) => throw new NotImplementedException();

        public virtual void Destroy()
        {
            RenderDevice!.VkDeviceApi.vkDestroyImageView(ImageViewHandle);

            // Swapchain images have no allocation, the swapchain owns them
            if (VmaAllocation is { } allocation)
            {
                vmaDestroyImage(RenderDevice!.VmaAllocator, ImageHandle, allocation);
            }
        }
    }
}
