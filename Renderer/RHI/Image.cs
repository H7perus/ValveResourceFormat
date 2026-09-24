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

        public VkImageLayout[] MipLayouts { get; internal set; }

        public uint Width { get; internal set; }
        public uint Height { get; internal set; }

        public uint SampleCount { get; internal set; }

        public unsafe Image(uint width, uint height, VkFormat format, uint mipLevels = 1, uint sampleCount = 1, VkImageUsageFlags imageUsage = VkImageUsageFlags.ColorAttachment)
        {
            Format = format;
            MipLayouts = new VkImageLayout[mipLevels];
            Array.Fill(MipLayouts, VkImageLayout.Undefined, 0, (int)mipLevels);

            Width = width;
            Height = height;
            SampleCount = sampleCount;

            double sampleCountLog = Math.Log2(sampleCount);

            //I hope float precision is enough here.
            if (sampleCountLog != Math.Floor(sampleCountLog) || sampleCount > 32)
            {
                throw new ArgumentException("sampleCount does not fit 2^n or is out of bounds!");
            }

            uint[] queueFamilies = [
                RenderDevice!.QueueFamilyIndices.GraphicsFamily!.Value,
                RenderDevice!.QueueFamilyIndices.TransferFamily!.Value
                ];        
            fixed (uint* pQueueFamilies = queueFamilies)
            {
                VkImageCreateInfo imageInfo = new()
                {
                    sType = VkStructureType.ImageCreateInfo,
                    imageType = VkImageType.Image2D,
                    format = Format,
                    extent = new VkExtent3D(Width, Height, 1),
                    mipLevels = mipLevels,
                    arrayLayers = 1,
                    samples = (VkSampleCountFlags)SampleCount,
                    tiling = VkImageTiling.Optimal,

                    usage = imageUsage,

                    sharingMode = VkSharingMode.Concurrent,
                    queueFamilyIndexCount = 2,
                    pQueueFamilyIndices = pQueueFamilies,
                    initialLayout = VkImageLayout.Undefined
                };

                VmaAllocationCreateInfo allocationCreateInfo = new()
                {
                    usage = VmaMemoryUsage.AutoPreferDevice,
                };

                VkResult result = vmaCreateImage(RenderDevice!.VmaAllocator, imageInfo, allocationCreateInfo, out var image, out var allocation);

                ImageHandle = image;
                VmaAllocation = allocation;

                // Determine aspect mask based on format
                VkImageAspectFlags aspectMask = Format switch
                {
                    VkFormat.D16UnormS8Uint or VkFormat.D24UnormS8Uint or VkFormat.D32SfloatS8Uint => VkImageAspectFlags.Depth | VkImageAspectFlags.Stencil,
                    VkFormat.D16Unorm or VkFormat.D24UnormS8Uint or VkFormat.D32Sfloat => VkImageAspectFlags.Depth,
                    _ => VkImageAspectFlags.Color
                };

                var imageViewInfo = new VkImageViewCreateInfo
                {
                    image = ImageHandle,
                    viewType = VkImageViewType.Image2D,
                    format = Format,
                    components = VkComponentMapping.Rgba,
                    subresourceRange = new VkImageSubresourceRange { baseMipLevel = 0, aspectMask = aspectMask, levelCount = mipLevels, layerCount = 1, baseArrayLayer = 0 }
                };

                RenderDevice!.VkDeviceApi.vkCreateImageView(imageViewInfo, out var viewHandle);

                ImageViewHandle = viewHandle;
            }
        }

        //When used as swapchain image
        internal Image(VkImage image, VkImageView imageView, uint width, uint height,  VkFormat format)
        {
            ImageHandle = image;
            ImageViewHandle = imageView;

            Format = format;
            MipLayouts = [VkImageLayout.Undefined];

            Width = width;
            Height = height;
        }

        public void Destroy()
        {
            RenderDevice!.VkDeviceApi.vkDestroyImageView(ImageViewHandle);

            RenderDevice!.VkDeviceApi.vkDestroyImage(ImageHandle);
        }
    }
}
