using System;
using System.Collections.Generic;
using System.Text;


using Vortice.Vulkan;
using static Vortice.Vulkan.Vulkan;

namespace ValveResourceFormat.Renderer.RHI
{
    public abstract class Pipeline : IResource
    {
        public VkPipeline Handle { get; protected set; }

        /// <summary>
        /// Gets the layout of the material parameter block this pipeline's shader reads, or <see langword="null"/>
        /// when it declares none. Swapped together with the pipeline on hot reload, so a material comparing it
        /// against the layout it last filled for always sees the one matching the pipeline it binds.
        /// </summary>
        public ParameterLayout? ParameterLayout { get; protected set; }

        public Pipeline()
        {
        }

        unsafe public virtual void Destroy()
        {
            if (Handle.Handle != 0)
                RenderDevice!.VkDeviceApi.vkDestroyPipeline(Handle, null);
        }

        public void ReplaceWith(Pipeline replacement)
        {
            Destroy();
            Handle = replacement.Handle;
        }
    }
}
