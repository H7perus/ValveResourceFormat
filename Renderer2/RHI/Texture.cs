using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Reflection.Metadata;
using System.Text;
using Vortice.Vulkan;
using static System.Net.Mime.MediaTypeNames;
using static Vortice.Vulkan.Vma;
using static Vortice.Vulkan.Vulkan;

namespace S2V_RHI_Test.RHI
{
    public class Texture : Image
    {
        

        public VkSampler SamplerHandle { get; private set; }
        

        public uint BindlessIndex { get; private set; }

        public DescriptorHandle<Texture> DescriptorHandle => new DescriptorHandle<Texture>(BindlessIndex);

        public unsafe Texture(uint width, uint height, VkFormat format = VkFormat.R8G8B8A8Unorm, uint mipLevels = 1) : base(width, height, format, mipLevels: mipLevels, imageUsage: VkImageUsageFlags.Sampled | VkImageUsageFlags.TransferDst)
        {
            var samplerInfo = new VkSamplerCreateInfo
            {
                magFilter = VkFilter.Linear,
                minFilter = VkFilter.Linear,
                mipmapMode = VkSamplerMipmapMode.Linear,
                mipLodBias = 0,
                anisotropyEnable = false,
                minLod = 0,
                maxLod = 1000,
            };



            SamplerHandle = RenderDevice!.CreateSampler(samplerInfo);

            BindlessIndex = RenderDevice!.GetBindlessSlot(VkDescriptorType.CombinedImageSampler, ImageViewHandle, SamplerHandle);

        }

        public void SetSampler(VkSampler sampler)
        {
            SamplerHandle = sampler;
            RenderDevice!.UpdateBindlessCombinedSampler(ImageViewHandle, sampler, BindlessIndex);
        }
        public unsafe void* Map()
        {
            void* data;
            vmaMapMemory(RenderDevice!.VmaAllocator, VmaAllocation!.Value, &data);
            return data;
        }

        public void Unmap()
        {
            vmaUnmapMemory(RenderDevice!.VmaAllocator, VmaAllocation!.Value);
        }
    }
}
