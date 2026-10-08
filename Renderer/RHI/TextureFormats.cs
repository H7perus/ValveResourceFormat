using Vortice.Vulkan;

namespace ValveResourceFormat.Renderer.RHI
{
    /// <summary>
    /// Maps Source 2 texture formats onto Vulkan formats.
    /// </summary>
    internal static class TextureFormats
    {
        /// <summary>Gets the Vulkan format for a texture format, or <see cref="VkFormat.Undefined"/> when there is none.</summary>
        /// <param name="format">The texture format.</param>
        /// <param name="srgb">Whether to use the sRGB variant, ignored for formats that have none.</param>
        public static VkFormat GetVkFormat(VTexFormat format, bool srgb) => (format, srgb && HasSrgbVariant(format)) switch
        {
#pragma warning disable format
            (VTexFormat.DXT1, false)          => VkFormat.Bc1RgbaUnormBlock,
            (VTexFormat.DXT1, true)           => VkFormat.Bc1RgbaSrgbBlock,
            (VTexFormat.DXT5, false)          => VkFormat.Bc3UnormBlock,
            (VTexFormat.DXT5, true)           => VkFormat.Bc3SrgbBlock,
            (VTexFormat.ATI1N, _)             => VkFormat.Bc4UnormBlock,
            (VTexFormat.ATI2N, _)             => VkFormat.Bc5UnormBlock,
            (VTexFormat.BC6H, _)              => VkFormat.Bc6hUfloatBlock,
            (VTexFormat.BC7, false)           => VkFormat.Bc7UnormBlock,
            (VTexFormat.BC7, true)            => VkFormat.Bc7SrgbBlock,
            (VTexFormat.ETC2, false)          => VkFormat.Etc2R8G8B8UnormBlock,
            (VTexFormat.ETC2, true)           => VkFormat.Etc2R8G8B8SrgbBlock,
            (VTexFormat.ETC2_EAC, false)      => VkFormat.Etc2R8G8B8A8UnormBlock,
            (VTexFormat.ETC2_EAC, true)       => VkFormat.Etc2R8G8B8A8SrgbBlock,

            (VTexFormat.R16, _)               => VkFormat.R16Unorm,
            (VTexFormat.RG1616, _)            => VkFormat.R16G16Unorm,
            (VTexFormat.RGBA16161616, _)      => VkFormat.R16G16B16A16Unorm,

            (VTexFormat.R16F, _)              => VkFormat.R16Sfloat,
            (VTexFormat.RG1616F, _)           => VkFormat.R16G16Sfloat,
            (VTexFormat.RGBA16161616F, _)     => VkFormat.R16G16B16A16Sfloat,

            (VTexFormat.R32F, _)              => VkFormat.R32Sfloat,
            (VTexFormat.RG3232F, _)           => VkFormat.R32G32Sfloat,
            (VTexFormat.RGB323232F, _)        => VkFormat.R32G32B32Sfloat,
            (VTexFormat.RGBA32323232F, _)     => VkFormat.R32G32B32A32Sfloat,

            (VTexFormat.RGBA8888, false)      => VkFormat.R8G8B8A8Unorm,
            (VTexFormat.RGBA8888, true)       => VkFormat.R8G8B8A8Srgb,
            (VTexFormat.BGRA8888, false)      => VkFormat.B8G8R8A8Unorm,
            (VTexFormat.BGRA8888, true)       => VkFormat.B8G8R8A8Srgb,
            (VTexFormat.I8, _)                => VkFormat.R8Unorm,
#pragma warning restore format

            _ => VkFormat.Undefined,
        };

        /// <summary>Gets whether a texture format has an sRGB variant.</summary>
        /// <param name="format">The texture format.</param>
        public static bool HasSrgbVariant(VTexFormat format) => format
            is VTexFormat.RGBA8888
            or VTexFormat.BGRA8888
            or VTexFormat.DXT1
            or VTexFormat.DXT5
            or VTexFormat.BC7
            or VTexFormat.ETC2
            or VTexFormat.ETC2_EAC;

        /// <summary>
        /// Gets whether a texture format can be decoded to RGBA8 on the CPU, for devices that cannot sample it
        /// in the needed shape.
        /// </summary>
        /// <param name="format">The texture format.</param>
        public static bool CanDecodeToRgba8(VTexFormat format) => format
            is VTexFormat.DXT1
            or VTexFormat.DXT5
            or VTexFormat.ATI1N
            or VTexFormat.ATI2N
            or VTexFormat.BC7;
    }
}
