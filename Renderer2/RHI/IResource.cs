using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

namespace ValveResourceFormat.Renderer2.RHI
{
    //With VK_EXT_descriptor_heap, these would become resource index and sampler index respectively.
    [StructLayout(LayoutKind.Sequential)]
    public readonly struct DescriptorHandle<T> where T : IResource
    {
        public readonly uint Index;
        public readonly uint padding;

        public DescriptorHandle(uint index, uint padding = 0)
        {
            Index = index;
            this.padding = padding;
        }
    }

    /// <summary>
    /// Used when swap-in-place is required. Example: Shader hot reloading requires to defer destruction of the old pipeline,
    /// because it is still in use.
    /// </summary>
    /// <typeparam name="T">The resource type</typeparam>
    public sealed class ResourceHandle<T> where T : class, IResource
    {
        private T _current;
        public T Current => Volatile.Read<T>(ref _current);

        internal T Swap(T next)
            => Interlocked.Exchange(ref _current, next);

        public ResourceHandle(T resource)
        {
            _current = resource;
        }
    }

    public interface IResource
    {
        public abstract void Destroy();
    }

    
}
