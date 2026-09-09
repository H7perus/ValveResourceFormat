using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using S2V_RHI_Test.RHI;
using SDL;
using ValveResourceFormat.Blocks;
using ValveResourceFormat.IO;
using ValveResourceFormat.Renderer.Shaders;
using ValveResourceFormat.ResourceTypes;
using Vortice.Vulkan;
using static GUI.Types.Viewers.ViewerContent;
using static S2vDevice;
using static SDL.SDL3;
using static Vortice.Vulkan.Vma;
using static Vortice.Vulkan.Vulkan;
using RhiBuffer = S2V_RHI_Test.RHI.Buffer;
using SlangShaderCompiler = S2V_RHI_Test.RHI.ShaderCompile.SlangShaderCompiler;

namespace GUI.Types.GLViewers;

/// <summary>
/// Interleaved vertex layout: POSITION (vec3) + NORMAL (vec3) + TEXCOORD0 (vec2).
/// Total size: 32 bytes.
/// </summary>
internal readonly struct Vertex
{
    public readonly Vector3 Position;
    public readonly Vector3 Normal;
    public readonly Vector2 Uv;

    public Vertex(Vector3 position, Vector3 normal, Vector2 uv)
    {
        Position = position;
        Normal = normal;
        Uv = uv;
    }
}

internal unsafe class VKTestModelViewer : IDisposable
{
    private readonly Model model;
    private readonly IFileLoader fileLoader;
    private readonly Func<Matrix4x4?> getViewMatrix;
    private SDL_Window* window;
    private Swapchain? swapchain;
    private CommandList? commandList;
    private PipelineGraphics? pipeline;
    private PipelineGraphics? pipelineModel;
    private RhiBuffer? vertexBuffer;
    private uint vertexCount;
    private RhiBuffer? indexBuffer;
    private uint indexCount;
    private RhiBuffer? uniformBuffer;
    private VkFence? fence;
    private VkSemaphore imageAvailableSemaphore;
    private float elapsedTime = 0f;
    private bool disposed;

    // Depth buffer (always enabled)
    private Image? depthImage;

    // Texture state for albedo map
    private S2V_RHI_Test.RHI.Texture? textureImage;
    private RhiBuffer? stagingBuffer;
    private uint textureWidth;
    private uint textureHeight;
    private bool textureUploaded = false;

    public VKTestModelViewer(Model model, IFileLoader fileLoader, Func<Matrix4x4?> getViewMatrix)
    {
        this.model = model;
        this.fileLoader = fileLoader;
        this.getViewMatrix = getViewMatrix;
    }

    /// <summary>Called from GLModelViewer.LoadScene() to set up scene graph nodes.</summary>
    public void LoadScene()
    {
    }

    /// <summary>Called from GLModelViewer.OnUpdate() for animation and root motion state.</summary>
    public void OnUpdate(float frameTime)
    {
    }

    /// <summary>Called from GLModelViewer.OnPaint() to render geometry to the Vulkan window.</summary>
    public void OnPaint(float frameTime)
    {
        if (swapchain == null)
        {

            // Defer all SDL/Vulkan setup to first OnPaint so it runs on the WinForms UI thread
            if (!SDL_Init(SDL_InitFlags.SDL_INIT_VIDEO))
            {
                Console.WriteLine($"SDL_Init failed: {SDL_GetError()}");
                return;
            }

            window = SDL_CreateWindow(
                "VK Test Viewer",
                800, 600,
                SDL_WindowFlags.SDL_WINDOW_VULKAN | SDL_WindowFlags.SDL_WINDOW_RESIZABLE
            );

            if (window == null)
            {
                Console.WriteLine($"SDL_CreateWindow failed: {SDL_GetError()}");
                return;
            }

            // Initialize Vulkan device via RHI singleton
            createS2vDevice(window);

            // Create swapchain
            swapchain = new Swapchain(800, 600);

            // Create depth buffer (D32Sfloat)
            uint width = swapchain.Extent.width;
            uint height = swapchain.Extent.height;
            depthImage = new Image(width, height, VkFormat.D32Sfloat, 1, 1, VkImageUsageFlags.DepthStencilAttachment);

            // Create command list for clearing
            var device = RenderDevice;
            if (device != null)
            {
                commandList = new CommandList(device.QueueFamilyIndices.GraphicsFamily!.Value);

                // Compile grid shader
                var slangCompiler = new SlangShaderCompiler();

                var module = slangCompiler.LoadShaderModule("../../../Shaders/grid.slang");
                var specShader = slangCompiler.SpecialiseAndCompile(module);

                // Grid pipeline: blending enabled for transparent lines, no depth writes
                pipeline = new PipelineGraphics(specShader, colorTargetFormat: VkFormat.B8G8R8A8Unorm, depthTargetFormat: VkFormat.D32Sfloat, blendEnable: true, depthWriteEnable: false);

                // Compile simple vertex shader (position + push constant)
                var module2 = slangCompiler.LoadShaderModule("../../../Shaders/simple_vert.slang");
                var specShader2 = slangCompiler.SpecialiseAndCompile(module2);

                // Build binding description for the model shader (POSITION + NORMAL + TEXCOORD)
                var bindingDescs = new BindingDescription[]
                {
                    new()
                    {
                        binding = 0,
                        stride = (uint)Marshal.SizeOf<Vertex>(),
                        attributes = [
                            new AttributeDescription
                            {
                                SemanticName = "POSITION",
                                SemanticIndex = 0,
                                Offset = 0,
                                Format = VkFormat.R32G32B32Sfloat
                            },
                            new AttributeDescription
                            {
                                SemanticName = "NORMAL",
                                SemanticIndex = 0,
                                Offset = (uint)Marshal.SizeOf<Vector3>(),
                                Format = VkFormat.R32G32B32Sfloat
                            },
                            new AttributeDescription
                            {
                                SemanticName = "TEXCOORD",
                                SemanticIndex = 0,
                                Offset = (uint)(Marshal.SizeOf<Vector3>() * 2),
                                // Vertex struct stores UV as Vector2 (two 32-bit floats)
                                Format = VkFormat.R32G32Sfloat
                            }
                        ]
                    }
                };

                // Model pipeline: opaque, no blending
                pipelineModel = new PipelineGraphics(specShader2, colorTargetFormat: VkFormat.B8G8R8A8Unorm, depthTargetFormat: VkFormat.D32Sfloat, bindingDescriptions: bindingDescs, blendEnable: false);

                // Load model mesh data and upload to Vulkan buffers
                var (vertices, indices) = ExtractModelGeometry(model);
                if (vertices.Length == 0)
                {
                    Console.WriteLine("No POSITION data found in model; falling back to test triangle");
                    vertices = new Vertex[]
                    {
                        new(new Vector3(0f, 0f, 0f), new Vector3(0f, 0f, -1f), new Vector2(0f, 0f)),
                        new(new Vector3(10f, 0f, 0f), new Vector3(0f, 0f, -1f), new Vector2(1f, 0f)),
                        new(new Vector3(5f, -10f, 0f), new Vector3(0f, 0f, -1f), new Vector2(0.5f, 1f))
                    };
                    indices = new uint[] { 0, 1, 2 };
                }

                vertexCount = (uint)vertices.Length;
                indexCount = (uint)indices.Length;

                // Upload vertex buffer
                var vertexBufferSize = (ulong)(vertices.Length * Marshal.SizeOf<Vertex>());
                vertexBuffer = new RhiBuffer(vertexBufferSize, VkBufferUsageFlags.VertexBuffer, VmaMemoryUsage.GpuToCpu);
                void* vmap = vertexBuffer.Map();
                fixed (Vertex* srcPtr = vertices)
                {
                    System.Buffer.MemoryCopy(srcPtr, vmap, vertices.Length * Marshal.SizeOf<Vertex>(), vertices.Length * Marshal.SizeOf<Vertex>());
                }
                vertexBuffer.Unmap();

                // Upload index buffer
                var indexBufferSize = (ulong)(indices.Length * sizeof(uint));
                indexBuffer = new RhiBuffer(indexBufferSize, VkBufferUsageFlags.IndexBuffer, VmaMemoryUsage.GpuToCpu);
                void* imap = indexBuffer.Map();
                fixed (uint* idxPtr = indices)
                {
                    System.Buffer.MemoryCopy(idxPtr, imap, indices.Length * sizeof(uint), indices.Length * sizeof(uint));
                }
                indexBuffer.Unmap();

                uniformBuffer = new RhiBuffer(256, VkBufferUsageFlags.UniformBuffer, VmaMemoryUsage.GpuToCpu);

                // Load first albedo texture from model materials and upload to Vulkan
                LoadAlbedoTexture(model, fileLoader);
            }
        }

        if (window == null || swapchain == null || commandList == null)
        {
            return;
        }

        // Pump and poll SDL events so Windows doesn't think we're hung
        SDL_PumpEvents();

        // Recreate swapchain if window was resized
        if (window != null)
        {
            int width = 0, height = 0;
            SDL_GetWindowSize(window, &width, &height);
            if (swapchain != null && (width != swapchain.Extent.width || height != swapchain.Extent.height))
            {
                Console.WriteLine($"Resizing swapchain to {width}x{height}");
                depthImage?.Destroy();
                swapchain.Recreate((uint)width, (uint)height);

                // Recreate depth buffer with new dimensions
                uint w = swapchain.Extent.width;
                uint h = swapchain.Extent.height;
                depthImage = new Image(w, h, VkFormat.D32Sfloat, 1, 1, VkImageUsageFlags.DepthStencilAttachment);
            }
        }

        elapsedTime += frameTime;

        // Update uniform buffer with view and projection matrices
        if (pipeline != null && uniformBuffer != null)
        {
            var viewMatrix = getViewMatrix();
            var aspectRatio = (float)swapchain.Extent.width / swapchain.Extent.height;
            var projectionMatrix = Matrix4x4.CreatePerspectiveFieldOfView(MathF.PI / 4f, aspectRatio, 0.1f, 1000f);
            projectionMatrix.M22 *= -1;
            void* mapped = uniformBuffer.Map();
            Matrix4x4* matrices = (Matrix4x4*)mapped;
            matrices[0] = viewMatrix ?? Matrix4x4.Identity;
            matrices[1] = projectionMatrix;
            var view = viewMatrix ?? Matrix4x4.Identity;
            Matrix4x4 invView;
            Matrix4x4.Invert(view, out invView);
            matrices[2] = invView;
            Matrix4x4 invProj;
            Matrix4x4.Invert(projectionMatrix, out invProj);
            matrices[3] = invProj;
            uniformBuffer.Unmap();
        }

        var dev = RenderDevice ?? throw new InvalidOperationException("Vulkan device not initialized");

        // Create synchronization primitives for single-frame-in-flight (lazy init)
        if (!fence.HasValue)
        {
            fence = dev.CreateFence(true);
            imageAvailableSemaphore = dev.CreateSemaphore();
        }

        // Wait for previous frame to finish before reusing resources
        dev.WaitForFences(fence.Value, true);
        dev.ResetFences(fence.Value);

        // Upload texture if not already done (synchronous transfer)
        if (!textureUploaded && stagingBuffer != null && textureImage != null)
        {
            commandList!.Begin();

            // Transition texture image to TransferDstOptimal
            commandList.ImageTransitionBarrier(textureImage,
                VkImageLayout.TransferDstOptimal,
                mipLevel: 0,
                srcBeforeTransition: VkPipelineStageFlags2.AllCommands,
                dstTransitionBefore: VkPipelineStageFlags2.AllCommands,
                dstMask: VkAccessFlags2.MemoryWrite,
                aspectFlags: VkImageAspectFlags.Color
                );

            // Copy buffer to image via raw Vulkan handle
            var region = new VkBufferImageCopy
            {
                bufferOffset = 0,
                bufferRowLength = 0,   // tightly packed
                bufferImageHeight = 0,
                imageSubresource = new VkImageSubresourceLayers
                {
                    aspectMask = VkImageAspectFlags.Color,
                    mipLevel = 0,
                    baseArrayLayer = 0,
                    layerCount = 1
                },
                imageOffset = new VkOffset3D(0, 0, 0),
                imageExtent = new VkExtent3D(textureWidth, textureHeight, 1)
            };

            dev.VkDeviceApi.vkCmdCopyBufferToImage(commandList.Handle, stagingBuffer!.Handle, textureImage!.ImageHandle,
                VkImageLayout.TransferDstOptimal, 1, &region);

            // Transition to ShaderReadOnlyOptimal for sampling
            commandList.ImageTransitionBarrier(textureImage,
                VkImageLayout.ShaderReadOnlyOptimal,
                mipLevel: 0,
                srcBeforeTransition: VkPipelineStageFlags2.AllCommands,
                dstTransitionBefore: VkPipelineStageFlags2.AllCommands,
                srcMask: VkAccessFlags2.MemoryWrite,
                dstMask: VkAccessFlags2.MemoryRead,
                aspectFlags: VkImageAspectFlags.Color
                );

            commandList.End();
            dev.SubmitGraphics(commandList, fifFreed: fence!.Value);

            dev.WaitForFences(fence!.Value);

            textureUploaded = true;
        }

        var currentImageIndex = swapchain.AcquireNextImage(imageAvailableSemaphore);

        // Skip rendering if swapchain is out of date (will be recreated on next frame)
        if (swapchain.IsOutOfDate)
        {
            return;
        }

        var image = swapchain.Images[currentImageIndex];
        var renderFinishedSemaphore = swapchain.WriteToImageFinishedSemaphores[currentImageIndex];

        var renderingInfo = new RenderingInfo
        {
            colorAttachments = [new()
            {
                image = image,
            }]
        };

        // Add depth attachment
        renderingInfo.depthAttachment = new RenderingAttachmentInfo
        {
            image = depthImage,
            loadOp = VkAttachmentLoadOp.Clear,
            storeOp = VkAttachmentStoreOp.Store,
            clearValue = new VkClearValue { depthStencil = new VkClearDepthStencilValue(1.0f, 0) }
        };

        commandList.Begin();

        commandList.ImageTransitionBarrier(depthImage, VkImageLayout.DepthAttachmentOptimal,
            srcBeforeTransition: VkPipelineStageFlags2.AllCommands,
            srcMask: VkAccessFlags2.DepthStencilAttachmentRead | VkAccessFlags2.DepthStencilAttachmentWrite,
            dstTransitionBefore: VkPipelineStageFlags2.AllCommands,
            dstMask: VkAccessFlags2.DepthStencilAttachmentRead | VkAccessFlags2.DepthStencilAttachmentWrite,
            aspectFlags: VkImageAspectFlags.Depth
            );

        commandList.ClearSwapchainImage(image, new VkClearColorValue(0.1f, 0.1f, 0.1f, 1.0f));
        commandList.BeginRendering(renderingInfo);


        VkViewport viewport = new() { x = 0, y = 0, width = swapchain.Extent.width, height = swapchain.Extent.height, minDepth = 0.0f, maxDepth = 1.0f };
        VkRect2D scissor = new() { extent = swapchain.Extent, offset = new() };


        commandList.SetViewport(viewport);
        commandList.SetScissor(scissor);

        // Draw model first (opaque, depth writes enabled)
        if (pipelineModel != null && vertexBuffer != null)
        {
            commandList.BindGraphicsPipeline(pipelineModel);
            commandList.BindVertexBuffer(vertexBuffer);
            commandList.PushConstants(uniformBuffer?.DescriptorHandle ?? default);
            if (indexBuffer != null && indexCount > 0)
            {
                commandList.BindIndexBuffer(indexBuffer);
                commandList.DrawIndexed(indexCount, 1, 0, 0, 0);
            }
            else
            {
                commandList.Draw(vertexCount, 1, 0, 0);
            }
        }

        // Draw grid second (transparent lines, blending enabled, no depth writes)
        if (pipeline != null)
        {
            commandList.BindGraphicsPipeline(pipeline);
            commandList.PushConstants(uniformBuffer?.DescriptorHandle ?? default);
            commandList.Draw(3u, 1u, 0u, 0u); // Full-screen triangle
        }

        commandList.EndRendering();
        commandList.ImageTransitionBarrier(image, VkImageLayout.PresentSrcKHR);
        commandList.End();

        // Submit and present
        dev.SubmitGraphics(commandList, imageAvailableSemaphore, renderFinishedSemaphore, fence!.Value);
        swapchain.Present(renderFinishedSemaphore);
    }

    /// <summary>
    /// Extracts POSITION, NORMAL, TEXCOORD0 attributes and index buffers from all embedded meshes,
    /// merging them into interleaved vertex arrays with indices having base vertex offsets applied.
    /// </summary>
    private static (Vertex[] Vertices, uint[] Indices) ExtractModelGeometry(Model model)
    {
        var verticesList = new List<Vertex>();
        var indicesList = new List<uint>();
        uint cumulativeVertexOffset = 0;

        foreach (var (mesh, _, _, _) in model.GetEmbeddedMeshesAndLoD())
        {
            if (mesh.VBIB == null)
            {
                continue;
            }

            // Find POSITION, NORMAL, and TEXCOORD0 attributes from the first vertex buffer
            VBIB.RenderInputLayoutField? positionAttribute = null;
            VBIB.RenderInputLayoutField? normalAttribute = null;
            VBIB.RenderInputLayoutField? uvAttribute = null;
            var vbibBuffer = mesh.VBIB.VertexBuffers.Count > 0 ? mesh.VBIB.VertexBuffers[0] : default;

            uint vertexCountBefore = (uint)verticesList.Count;

            if (vbibBuffer.ElementCount > 0)
            {
                // Debug: print all input layout fields
                Console.WriteLine($"Mesh '{mesh.Name}' has {vbibBuffer.InputLayoutFields.Length} input layout fields:");
                foreach (var field in vbibBuffer.InputLayoutFields)
                {
                    Console.WriteLine($"  Semantic={field.SemanticName}, Index={field.SemanticIndex}, Format={field.Format}, Offset={field.Offset}");
                }

                foreach (var field in vbibBuffer.InputLayoutFields)
                {
                    switch (field.SemanticName)
                    {
                        case "POSITION" when positionAttribute is null && field.Format == ValveResourceFormat.DXGI_FORMAT.R32G32B32_FLOAT:
                            positionAttribute = field;
                            break;
                        case "NORMAL" when normalAttribute is null:
                            // Accept any NORMAL format - VBIB.GetNormalTangentArray handles all variants
                            normalAttribute = field;
                            break;
                        case "TEXCOORD" when uvAttribute is null && (
                            field.Format == ValveResourceFormat.DXGI_FORMAT.R32G32_FLOAT ||
                            field.Format == ValveResourceFormat.DXGI_FORMAT.R16G16_FLOAT ||
                            field.Format == ValveResourceFormat.DXGI_FORMAT.R16G16_UNORM ||
                            field.Format == ValveResourceFormat.DXGI_FORMAT.R16G16_SNORM):
                            // Accept all UV formats - VBIB.GetVector2AttributeArray handles them
                            uvAttribute = field;
                            break;
                    }
                }

            if (positionAttribute.HasValue)
            {
                Vector3[]? positions = null;
                Vector3[]? normals = null;
                Vector2[]? uvs = null;

                try
                {
                    positions = VBIB.GetVector3AttributeArray(vbibBuffer, positionAttribute.Value);
                }
                catch { /* Skip invalid POSITION data */ }

                if (normalAttribute.HasValue && positions != null)
                {
                    try
                    {
                        // Use GetNormalTangentArray which handles all formats (uncompressed float + compressed variants)
                        var (extractedNormals, _) = VBIB.GetNormalTangentArray(vbibBuffer, normalAttribute.Value);
                        normals = extractedNormals;
                    }
                    catch { /* Skip invalid NORMAL data */ }
                }

                if (uvAttribute.HasValue && positions != null)
                {
                    try
                    {
                        uvs = VBIB.GetVector2AttributeArray(vbibBuffer, uvAttribute.Value);
                    }
                    catch { /* Skip invalid TEXCOORD data */ }
                }

                // Create interleaved vertices with defaults for missing attributes
                var defaultNormal = new Vector3(0f, 0f, -1f);
                var defaultUv = new Vector2(0f, 0f);

                for (int i = 0; i < positions.Length; i++)
                {
                    verticesList.Add(new Vertex(
                        position: positions[i],
                        normal: normals?[i] ?? defaultNormal,
                        uv: uvs?[i] ?? defaultUv
                    ));
                }
            }
            }

            // Extract index data from the first index buffer (if present)
            uint vertexCountForMesh = (uint)verticesList.Count - vertexCountBefore;
            if (mesh.VBIB.IndexBuffers.Count > 0 && vertexCountForMesh > 0)
            {
                var indexBuffer = mesh.VBIB.IndexBuffers[0];
                var elementSize = indexBuffer.ElementSizeInBytes;
                var indexData = indexBuffer.Data;

                // Convert indices to uint32, applying cumulative vertex offset
                for (uint i = 0; i < indexBuffer.ElementCount; i++)
                {
                    uint indexValue = elementSize switch
                    {
                        2 => BitConverter.ToUInt16(indexData, (int)i * 2),
                        4 => BitConverter.ToUInt32(indexData, (int)i * 4),
                        _ => throw new InvalidOperationException($"Unsupported index element size: {elementSize}"),
                    };

                    indicesList.Add(indexValue + cumulativeVertexOffset);
                }
            }

            // Update cumulative vertex offset for next mesh
            cumulativeVertexOffset += vertexCountForMesh;
        }

        return ([.. verticesList], [.. indicesList]);
    }

    /// <summary>
    /// Loads the first albedo (g_tColor) texture from the model's materials and uploads mip 0 to Vulkan.
    /// </summary>
    private void LoadAlbedoTexture(Model model, IFileLoader fileLoader)
    {
        // Get material groups
        var materialGroups = model.GetMaterialGroups().ToList();
        if (materialGroups.Count == 0)
        {
            Console.WriteLine("No material groups found in model; skipping texture load");
            return;
        }

        // Use first material group, first material
        var materialGroup = materialGroups[0];
        if (materialGroup.Materials.Length == 0)
        {
            Console.WriteLine("No materials in first material group; skipping texture load");
            return;
        }

        string materialPath = materialGroup.Materials[0];
        var materialResource = fileLoader.LoadFileCompiled(materialPath);
        if (materialResource?.DataBlock is not Material material)
        {
            Console.WriteLine($"Failed to load material: {materialPath}");
            return;
        }

        // Find g_tColor texture path
        string? texturePath = null;
        if (material.TextureParams.TryGetValue("g_tColor", out var colorTexturePath))
        {
            texturePath = colorTexturePath;
        }
        else if (material.TextureParams.Count > 0)
        {
            // Fallback to first texture parameter
            texturePath = material.TextureParams.Values.FirstOrDefault();
        }

        if (string.IsNullOrEmpty(texturePath))
        {
            Console.WriteLine("No texture found in material; skipping texture load");
            return;
        }

        var textureResource = fileLoader.LoadFileCompiled(texturePath);
        if (textureResource?.DataBlock is not ValveResourceFormat.ResourceTypes.Texture vrfTexture)
        {
            Console.WriteLine($"Failed to load texture: {texturePath}");
            return;
        }

        // Get mip 0 dimensions and data
        uint width = (uint)vrfTexture.Width;
        uint height = (uint)vrfTexture.Height;
        textureWidth = width;
        textureHeight = height;

        Console.WriteLine($"Loading albedo texture: {width}x{height}");

        // Determine VkFormat based on VTexFormat
        var vtexFormat = vrfTexture.Format;
        VkFormat vkFormat = vtexFormat switch
        {
            ValveResourceFormat.VTexFormat.DXT1 => VkFormat.Bc1RgbUnormBlock,
            ValveResourceFormat.VTexFormat.DXT5 => VkFormat.Bc3UnormBlock,
            ValveResourceFormat.VTexFormat.ATI1N => VkFormat.Bc4UnormBlock,
            _ => VkFormat.R8G8B8A8Unorm
        };

        // Calculate buffer size for this mip level
        int bufferSize = vrfTexture.CalculateBufferSizeForMipLevel(0);

        // Read raw (compressed or uncompressed) texture data
        byte[] pixels = new byte[bufferSize];
        try
        {
            Span<byte> pixelSpan = pixels.AsSpan();
            vrfTexture.ReadTextureMipLevel(pixelSpan, 0);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to read texture mip 0: {ex.Message}");
            return;
        }

        // Create staging buffer and copy pixels (CPU side only)
        ulong stagingBufferSize = (ulong)pixels.Length;
        stagingBuffer = new RhiBuffer(stagingBufferSize, VkBufferUsageFlags.TransferSrc, VmaMemoryUsage.CpuToGpu);
        void* stagemap = stagingBuffer.Map();
        fixed (byte* srcPtr = pixels)
        {
            System.Buffer.MemoryCopy(srcPtr, stagemap, pixels.Length, pixels.Length);
        }
        stagingBuffer.Unmap();

        // Create texture image (sampler created in constructor)
        textureImage = new S2V_RHI_Test.RHI.Texture(width, height, vkFormat, mipLevels: 1);
    }

    public void Dispose()
    {
        if (disposed)
        {
            return;
        }

        disposed = true;

        // Clean up depth buffer and texture
        depthImage?.Destroy();
        textureImage?.Destroy();

        if (window != null)
        {
            SDL_DestroyWindow(window);
            window = null;
        }

        SDL_Quit();
    }
}
