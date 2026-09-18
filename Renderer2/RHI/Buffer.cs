using System;
using Vortice.Vulkan;
using static Vortice.Vulkan.Vma;

namespace ValveResourceFormat.Renderer2.RHI
{
    public class Buffer : IResource
    {
        public VkBuffer Handle { get; private set; }
        public VmaAllocation VmaAllocation { get; private set; }
        public ulong Size { get; private set; }

        public uint BindlessIndex { get; private set; }

        public DescriptorHandle<Buffer> DescriptorHandle => new DescriptorHandle<Buffer>(BindlessIndex);

        public Buffer(ulong size, VkBufferUsageFlags usage, VmaMemoryUsage memoryUsage, VmaAllocationCreateFlags allocationFlags = VmaAllocationCreateFlags.None, string? name = null)
        {
            Size = size;

            CreateBuffer(usage, memoryUsage, allocationFlags, name);

            //hack. Optimally we have a StorageBuffer and a UniformBuffer subtype and what else comes up
            if(usage == VkBufferUsageFlags.UniformBuffer)
                BindlessIndex = RenderDevice!.GetBindlessSlot(VkDescriptorType.UniformBuffer, Handle);

        }

        unsafe void CreateBuffer(VkBufferUsageFlags usage, VmaMemoryUsage memoryUsage, VmaAllocationCreateFlags allocationFlags, string? name = null)
        {
            //TODO: review whether we should use sharing mode exclusive or concurrent
            VkBufferCreateInfo bufferCreateInfo = new()
            {
                size = Size,
                usage = usage,
                sharingMode = VkSharingMode.Exclusive,
            };

            VmaAllocationCreateInfo allocationCreateInfo = new()
            {
                flags = allocationFlags,
                usage = memoryUsage,
            };

            vmaCreateBuffer(RenderDevice!.VmaAllocator, bufferCreateInfo, allocationCreateInfo, out var buffer, out var allocation);
            Handle = buffer;
            VmaAllocation = allocation;

            if (name != null)
            {
                RenderDevice!.SetObjectDebugName(Handle, VkObjectType.Buffer, name);
            }

        }

        public unsafe void* Map()
        {
            void* data;
            vmaMapMemory(RenderDevice!.VmaAllocator, VmaAllocation, &data);
            return data;
        }

        public void Unmap()
        {
            vmaUnmapMemory(RenderDevice!.VmaAllocator, VmaAllocation);
        }
    }
}
