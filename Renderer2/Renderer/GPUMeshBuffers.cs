using System.Runtime.InteropServices;
using ValveResourceFormat.Blocks;
using Vortice.Vulkan;

namespace ValveResourceFormat.Renderer2
{
    /// <summary>
    /// GPU vertex and index buffers created from <see cref="VBIB"/> mesh data.
    /// </summary>
    public class GPUMeshBuffers
    {
        /// <summary>Gets the OpenGL handles for each uploaded vertex buffer.</summary>
        public RHI.Buffer[] VertexBuffers { get; private set; }

        /// <summary>Gets the OpenGL handles for each uploaded index buffer.</summary>
        public RHI.Buffer[] IndexBuffers { get; private set; }

        /// <summary>Uploads all vertex and index buffers from the provided <see cref="VBIB"/> to the GPU.</summary>
        /// <param name="vbib">Source vertex and index buffer data.</param>
        /// <param name="name">Mesh name used to label the buffers.</param>
        public unsafe GPUMeshBuffers(VBIB vbib, string name)
        {
            VertexBuffers = new RHI.Buffer[vbib.VertexBuffers.Count];

            for (var i = 0; i < vbib.VertexBuffers.Count; i++)
            {
                var buffer = vbib.VertexBuffers[i];
                buffer.Data.AsSpan(0, (int)buffer.TotalSizeInBytes);
                VertexBuffers[i] = new RHI.Buffer(buffer.TotalSizeInBytes, VkBufferUsageFlags.VertexBuffer, VmaMemoryUsage.GpuToCpu, name: $"{name} VB {i}");

                var mappedPtr = VertexBuffers[i].Map();
                Marshal.Copy(buffer.Data, 0, (nint)mappedPtr, (int)buffer.TotalSizeInBytes);
                VertexBuffers[i].Unmap();
            }

            IndexBuffers = new RHI.Buffer[vbib.IndexBuffers.Count];

            for (var i = 0; i < vbib.IndexBuffers.Count; i++)
            {
                var buffer = vbib.IndexBuffers[i];
                IndexBuffers[i] = new RHI.Buffer(buffer.TotalSizeInBytes, VkBufferUsageFlags.IndexBuffer, VmaMemoryUsage.GpuToCpu, name: $"{name} IB {i}");

                var mappedPtr = IndexBuffers[i].Map();
                Marshal.Copy(buffer.Data, 0, (nint)mappedPtr, (int)buffer.TotalSizeInBytes);
                IndexBuffers[i].Unmap();
            }
        }

        /// <summary>Deletes all GPU vertex and index buffers.</summary>
        public void Delete()
        {
            //VKTODO: Obviously a catastrophy to not delete, but we first need a deletion queue
            //GL.DeleteBuffers(VertexBuffers.Length, VertexBuffers);
            //GL.DeleteBuffers(IndexBuffers.Length, IndexBuffers);
        }
    }
}
