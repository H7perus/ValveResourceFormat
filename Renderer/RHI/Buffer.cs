using System;
using Vortice.Vulkan;
using static Vortice.Vulkan.Vma;

namespace ValveResourceFormat.Renderer.RHI
{
    public class Buffer : IResource
    {
        public VkBuffer Handle { get; private set; }
        public VmaAllocation VmaAllocation { get; private set; }
        public ulong Size { get; private set; }

        public uint BindlessIndex { get; private set; }

        // Which bindless table BindlessIndex lives in, null for buffers without a slot such as vertex buffers
        private VkDescriptorType? bindlessType;

        public DescriptorHandle<Buffer> DescriptorHandle => new DescriptorHandle<Buffer>(BindlessIndex);

        public Buffer(ulong size, VkBufferUsageFlags usage, VmaMemoryUsage memoryUsage, VmaAllocationCreateFlags allocationFlags = VmaAllocationCreateFlags.None, string? name = null)
        {
            // Uniform usage excludes storage, vertex and index usage, while storage combines with vertex and index.
            // Uniform and storage would need a bindless slot in each table, and constant buffer layout rules
            // cannot describe tightly packed vertex or index data the way a storage buffer can.
            const VkBufferUsageFlags NotWithUniform = VkBufferUsageFlags.StorageBuffer | VkBufferUsageFlags.VertexBuffer | VkBufferUsageFlags.IndexBuffer;

            if ((usage & VkBufferUsageFlags.UniformBuffer) != 0 && (usage & NotWithUniform) != 0)
            {
                throw new ArgumentException($"A uniform buffer cannot also have {usage & NotWithUniform} usage", nameof(usage));
            }

            Size = size;

            CreateBuffer(usage, memoryUsage, allocationFlags, name);

            if ((usage & VkBufferUsageFlags.UniformBuffer) != 0)
            {
                bindlessType = VkDescriptorType.UniformBuffer;
            }
            else if ((usage & VkBufferUsageFlags.StorageBuffer) != 0)
            {
                bindlessType = VkDescriptorType.StorageBuffer;
            }

            if (bindlessType is { } type)
            {
                BindlessIndex = RenderDevice!.GetBindlessSlot(type, Handle);
            }
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


        public void Destroy()
        {
            // Only safe once the GPU is done with the buffer, which is when the destroy queue gets to it,
            // so the slot cannot be handed out again while an in-flight frame still reads through it
            if (bindlessType is { } type)
            {
                RenderDevice!.FreeBindlessSlot(type, BindlessIndex);
                bindlessType = null;
            }

            vmaDestroyBuffer(RenderDevice!.VmaAllocator, Handle, VmaAllocation);
        }
    }
}
