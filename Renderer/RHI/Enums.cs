using System;
using System.Collections.Generic;
using System.Text;

namespace ValveResourceFormat.Renderer.RHI
{
    /// <summary>The component type of a shader value.</summary>
    public enum ElementType : byte
    {
        /// <summary>Not a plain value, such as a texture handle.</summary>
        None,
        /// <summary>32 bit float components.</summary>
        Float,
        /// <summary>32 bit signed integer components.</summary>
        Int,
        /// <summary>32 bit unsigned integer components.</summary>
        Uint,
        /// <summary>Boolean components, stored as 32 bit 0 or 1.</summary>
        Bool,
    }

    /// <summary>The shape of a texture as a shader declares it.</summary>
    public enum TextureDimension : byte
    {
        /// <summary>Not a texture.</summary>
        None,
        /// <summary>A one dimensional texture.</summary>
        Texture1D,
        /// <summary>A two dimensional texture.</summary>
        Texture2D,
        /// <summary>A three dimensional (volume) texture.</summary>
        Texture3D,
        /// <summary>A cube texture.</summary>
        TextureCube,
        /// <summary>An array of one dimensional textures.</summary>
        Texture1DArray,
        /// <summary>An array of two dimensional textures.</summary>
        Texture2DArray,
        /// <summary>An array of cube textures.</summary>
        TextureCubeArray,
    }
}
