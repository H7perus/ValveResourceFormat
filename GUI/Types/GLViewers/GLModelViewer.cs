using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using GUI.Controls;
using GUI.Utils;
using ValveResourceFormat.Blocks;
using ValveResourceFormat.IO;
using ValveResourceFormat.IO.ContentFormats.HalfEdgeMesh;
using ValveResourceFormat.Renderer;
using ValveResourceFormat.Renderer.SceneEnvironment;
using ValveResourceFormat.Renderer.SceneNodes;
using ValveResourceFormat.Renderer.Utils;
using ValveResourceFormat.ResourceTypes;
using ValveResourceFormat.ResourceTypes.ModelAnimation;
using Vortice.Vulkan;
using static ValveResourceFormat.Renderer2.RHI.S2vDevice;
using ValveResourceFormat.Renderer2.RHI;
using RhiBuffer = ValveResourceFormat.Renderer2.RHI.Buffer;
using SlangShaderCompiler = ValveResourceFormat.Renderer2.RHI.ShaderCompile.SlangShaderCompiler;

namespace GUI.Types.GLViewers
{
    class GLModelViewer : GLSingleNodeViewer
    {
        protected Model? model { get; init; }
        private PhysAggregateData? phys;

        private readonly List<string?> animationIndexMap = [];

        public ComboBox? animationComboBox { get; protected set; }
        protected CheckBox? animationPlayPause;
        private CheckBox? rootMotionCheckBox;
        private CheckBox? additiveCheckBox;
        private CheckBox? showSkeletonCheckbox;
        private CheckBox? showAttachmentsCheckbox;
        private CheckBox? showParticlesCheckbox;
        private ComboBox? hitboxComboBox;
        private Label? animationTimeLabel;
        private GLViewerSliderControl? animationTrackBar;
        private GLViewerSliderControl? slowmodeTrackBar;
        private GLViewerMultiSelectionControl? attachmentList;
        public CheckedListBox? meshGroupListBox { get; private set; }
        public ComboBox? materialGroupListBox { get; private set; }
        private ComboBox? lodComboBox;
        private bool hasSelectableLods;
        private bool modelStatsDirty;
        private bool modelStatsPosted;
        private int statsLod = -1;
        private ModelSceneNode? modelSceneNode;
        protected AnimationController? animationController;
        protected SkeletonSceneNode? skeletonSceneNode;
        private HitboxSetSceneNode? hitboxSetSceneNode;
        private List<ParticleSceneNode> modelParticleNodes = [];
        private CheckedListBox? physicsGroupsComboBox;
        private int animationComboBoxCurrentIndex = -1;


        private readonly IFileLoader fileLoader;
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
        private ValveResourceFormat.Renderer2.RHI.Texture? textureImage;
        private RhiBuffer? stagingBuffer;
        private uint textureWidth;
        private uint textureHeight;
        private bool textureUploaded = false;





        public GLModelViewer(VrfGuiContext vrfGuiContext, RendererContext rendererContext) : base(vrfGuiContext, rendererContext)
        {
        }

        public GLModelViewer(VrfGuiContext vrfGuiContext, RendererContext rendererContext, Model model) : base(vrfGuiContext, rendererContext)
        {
            this.model = model;
            this.fileLoader = rendererContext.FileLoader;
        }

        public GLModelViewer(VrfGuiContext vrfGuiContext, RendererContext rendererContext, PhysAggregateData phys) : base(vrfGuiContext, rendererContext)
        {
            this.phys = phys;
        }

        public override void Dispose()
        {
            base.Dispose();

            animationComboBox?.Dispose();
            animationPlayPause?.Dispose();
            animationTimeLabel?.Dispose();
            animationTrackBar?.Dispose();
            slowmodeTrackBar?.Dispose();
            attachmentList?.Dispose();
            meshGroupListBox?.Dispose();
            materialGroupListBox?.Dispose();
            lodComboBox?.Dispose();
            physicsGroupsComboBox?.Dispose();
            rootMotionCheckBox?.Dispose();
            additiveCheckBox?.Dispose();
            showSkeletonCheckbox?.Dispose();
            showAttachmentsCheckbox?.Dispose();
            showParticlesCheckbox?.Dispose();
            hitboxComboBox?.Dispose();
        }

        private void AddAnimationListComboBox()
        {
            Debug.Assert(UiControl != null);
            Debug.Assert(animationController != null);

            animationComboBox = UiControl.AddSelection("Animation", (animation, i) =>
            {
                // Initialize on first call
                if (animationComboBoxCurrentIndex < -1)
                {
                    animationComboBoxCurrentIndex = i;
                    return;
                }

                if (i < 0)
                {
                    return;
                }

                if (animationComboBox!.Items[i] is ThemedComboBoxItem item && item.IsHeader)
                {
                    // Skip header selection and jump to adjacent non-header item
                    animationComboBox.SelectedIndex = animationComboBoxCurrentIndex > i ? i - 1 : i + 1;
                    return;
                }

                animationComboBoxCurrentIndex = i;
                Debug.Assert(modelSceneNode != null);
                using (var lockedGL = MakeCurrent())
                {
                    if (animationIndexMap.Count > i &&
                        animationIndexMap[i] is string animationId)
                    {
                        modelSceneNode.SetAnimationByName(animationId);
                    }
                    else
                    {
                        modelSceneNode.SetAnimation(null);
                    }
                }

                SyncAnimationToggles();
            });
        }

        protected void AddAnimationControls(bool includeAnimationList = true)
        {
            Debug.Assert(UiControl != null);
            Debug.Assert(animationController != null);

            using var _ = UiControl.BeginGroup("Animation");

            if (includeAnimationList)
            {
                AddAnimationListComboBox();
            }

            animationTimeLabel = new Label()
            {
                AutoSize = true,
            };
            UiControl.AddControl(animationTimeLabel);

            animationPlayPause = UiControl.AddCheckBox("Autoplay", true, isChecked =>
            {
                if (animationController != null)
                {
                    animationController.IsPaused = !isChecked;
                }
            });
            animationTrackBar = UiControl.AddTrackBar(frame =>
            {
                if (animationController?.ActiveAnimation is { CycleFrames: > 0 } animation)
                {
                    animationController.Frame = (int)MathF.Round(frame * animation.CycleFrames);
                }
            });

            slowmodeTrackBar = UiControl.AddTrackBar(value =>
            {
                animationController.FrametimeMultiplier = value;
            }, animationController.FrametimeMultiplier);

            animationPlayPause.Enabled = false;
            animationTrackBar.Enabled = false;
            slowmodeTrackBar.Enabled = false;
            slowmodeTrackBar.Slider.Value = animationController.FrametimeMultiplier;

            var previousPaused = false;
            animationTrackBar.Slider.MouseDown += (_, __) =>
            {
                previousPaused = animationController.IsPaused;
                animationController.IsPaused = true;
            };
            animationTrackBar.Slider.MouseUp += (_, __) =>
            {
                animationController.IsPaused = previousPaused;
            };

            rootMotionCheckBox = UiControl.AddCheckBox("Show Root Motion", enableRootMotion, (isChecked) =>
            {
                enableRootMotion = isChecked;
                rootMotionResetPending = true;
            });

            rootMotionCheckBox.Checked = false;
            rootMotionCheckBox.Enabled = false;

            additiveCheckBox = UiControl.AddCheckBox("Additive (over bind pose)", false, isChecked =>
            {
                animationController.ApplyAdditive = isChecked;
            });

            additiveCheckBox.Enabled = false;
        }

        /// <summary>
        /// Syncs the root motion and additive toggles to the active animation: root motion defaults
        /// on for animations that carry it, the additive checkbox mirrors the player state.
        /// </summary>
        protected void SyncAnimationToggles()
        {
            Debug.Assert(animationController != null);

            var activeAnimation = animationController.ActiveAnimation;
            var hasRootMotion = activeAnimation?.HasMovementData() ?? false;
            rootMotionCheckBox!.Enabled = hasRootMotion;
            rootMotionCheckBox.Checked = hasRootMotion;
            enableRootMotion = hasRootMotion;

            rootMotionResetPending = true;

            additiveCheckBox!.Enabled = activeAnimation is not null
                && (activeAnimation is not ClipAnimation || activeAnimation.IsAdditive);
            additiveCheckBox.Checked = animationController.ApplyAdditive;
        }

        protected override void LoadScene()
        {
            // TODO [Vulkan test]: Stubbed — createS2vDevice requires UiControl.Handle, defer until later
            

            // TODO [GL removal]: Commented out - OpenGL scene loading disabled
            /*
            base.LoadScene();

            InitializeSoundPlayer();

            if (model != null)
            {
                modelSceneNode = new ModelSceneNode(Scene, model);
                animationController = modelSceneNode.AnimationController;
                Scene.Add(modelSceneNode, true);

                if (modelSceneNode.RenderableMeshes.Count == 1)
                {
                    var mesh = modelSceneNode.RenderableMeshes[0];

                    // check if this is a static overlay world model
                    if (mesh.DrawCallsOverlay.Count > 0
                        && mesh.DrawCallsOpaque.Count == 0
                        && mesh.DrawCallsBlended.Count == 0)
                    {
                        foreach (var drawCall in mesh.DrawCallsOverlay)
                        {
                            drawCall.Material.IsOverlay = false; // render without trying to overlay on empty space
                        }
                    }
                }

                skeletonSceneNode = new SkeletonSceneNode(Scene, animationController.Pose, model.Skeleton, model.Attachments);
                Scene.Add(skeletonSceneNode, true);

                if (model.HitboxSets != null && model.HitboxSets.Count > 0)
                {
                    hitboxSetSceneNode = new HitboxSetSceneNode(Scene, animationController, model.HitboxSets);
                    Scene.Add(hitboxSetSceneNode, true);
                }

                modelParticleNodes = ParticleSceneNode.CreateModelParticles(Scene, model, modelSceneNode);
                foreach (var particleNode in modelParticleNodes)
                {
                    Scene.Add(particleNode, true);
                }

                phys = model.GetEmbeddedPhys();
                if (phys == null)
                {
                    var refPhysicsPaths = model.GetReferencedPhysNames().ToArray();
                    if (refPhysicsPaths.Length != 0)
                    {
                        //TODO are there any models with more than one vphys?
                        if (refPhysicsPaths.Length != 1)
                        {
                            Log.Debug(nameof(GLModelViewer), $"Model has more than 1 vphys ({refPhysicsPaths.Length})." +
                                " Please report this on https://github.com/ValveResourceFormat/ValveResourceFormat and provide the file that caused this.");
                        }

                        var newResource = Scene.RendererContext.FileLoader.LoadFileCompiled(refPhysicsPaths.First());
                        if (newResource != null && newResource.DataBlock is PhysAggregateData newPhys)
                        {
                            phys = newPhys;
                        }
                    }
                }
            }
            else
            {
                Picker?.OnPicked -= OnPicked;
            }

            if (phys != null)
            {
                if (phys.Parts.Length > 0)
                {
                    Scene.PhysicsWorld = new Rubikon(phys);

                    var isMapPhysics = Path.GetFileNameWithoutExtension(GuiContext.FileName)
                        .Equals("world_physics", StringComparison.OrdinalIgnoreCase);

                    Input.PlayerMovement.GridPlaneCollisionEnabled = !isMapPhysics;
                }

                var physSceneNodes = PhysSceneNode.CreatePhysSceneNodes(Scene, phys, null).ToList();

                // Physics are not shown by default unless the model has no meshes
                var enabledAllPhysByDefault = modelSceneNode == null || modelSceneNode.RenderableMeshes.Count == 0;

                foreach (var physSceneNode in physSceneNodes)
                {
                    physSceneNode.Enabled = enabledAllPhysByDefault;
                    physSceneNode.IsTranslucentRenderMode = false;
                    Scene.Add(physSceneNode, false);
                }
            }

            var post = new ScenePostProcessVolume(Scene)
            {
                HasBloom = true,
                IsMaster = true,
            };

            Scene.PostProcessInfo.AddPostProcessVolume(post);
            */
        }


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
        private unsafe void LoadAlbedoTexture(Model model, IFileLoader fileLoader)
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
            textureImage = new ValveResourceFormat.Renderer2.RHI.Texture(width, height, vkFormat, mipLevels: 1);
        }

        protected unsafe override void AddUiControls()
        {
            Debug.Assert(UiControl != null);
            
            var _handle = GLControl!.Handle;

            var swapchain = GLControl!.Swapchain;

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

                uniformBuffer = new RhiBuffer(256 + (ulong)sizeof(DescriptorHandle<Image>), VkBufferUsageFlags.UniformBuffer, VmaMemoryUsage.GpuToCpu);

                // Load first albedo texture from model materials and upload to Vulkan
                LoadAlbedoTexture(model, fileLoader);
            }




            var dev = RenderDevice!;

            // TODO [GL removal]: Only add UI controls if modelSceneNode exists (requires LoadScene to run)
            if (model != null && modelSceneNode != null)
            {
                //Debug.Assert(modelSceneNode != null);

                Input.OrbitTargetProvider = () => modelSceneNode.BoundingBox.Center;

                var animations = modelSceneNode.Animations.Keys.ToArray();

                if (animations.Length > 0)
                {
                    AddAnimationControls();
                    SetAvailableAnimations(animations);
                    SetAnimationControllerUpdateHandler();
                }

                if (model.Skeleton.Bones.Length > 0)
                {
                    using var _ = UiControl.BeginGroup("Model");

                    showSkeletonCheckbox = UiControl.AddCheckBox("Show skeleton", false, isChecked =>
                    {
                        using var lockedGl = MakeCurrent();
                        skeletonSceneNode?.ShowBones = isChecked;
                    });
                }

                if (model.Attachments.Count > 0)
                {
                    using var _ = UiControl.BeginGroup("Model");

                    showAttachmentsCheckbox = UiControl.AddCheckBox("Show attachments", false, isChecked =>
                    {
                        attachmentList?.Visible = isChecked;

                        using var lockedGl = MakeCurrent();

                        skeletonSceneNode?.ShowAttachments = isChecked;
                    });



                    attachmentList = UiControl.AddMultiSelectionControl("Attachments", listBox =>
                    {
                        listBox.Items.AddRange([.. model.Attachments.Keys]);
                        for (var i = 0; i < listBox.Items.Count; i++)
                        {
                            listBox.SetItemChecked(i, true);
                        }

                        skeletonSceneNode?.SelectedAttachments.UnionWith(model.Attachments.Keys);
                    }, selectedAttachments =>
                    {
                        using var lockedGl = MakeCurrent();

                        if (skeletonSceneNode != null)
                        {
                            skeletonSceneNode.SelectedAttachments.Clear();
                            skeletonSceneNode.SelectedAttachments.UnionWith(selectedAttachments);
                        }
                    });
                    attachmentList.Visible = false;
                }

                if (modelParticleNodes.Count > 0)
                {
                    using var _ = UiControl.BeginGroup("Model");

                    showParticlesCheckbox = UiControl.AddCheckBox("Show particles", true, isChecked =>
                    {
                        using var lockedGl = MakeCurrent();

                        foreach (var particleNode in modelParticleNodes)
                        {
                            particleNode.LayerEnabled = isChecked;
                        }
                    });
                }

                if (model.HitboxSets != null && model.HitboxSets.Count > 0)
                {
                    Debug.Assert(hitboxSetSceneNode != null);

                    using var _ = UiControl.BeginGroup("Model");

                    var hitboxSets = model.HitboxSets;
                    hitboxComboBox = UiControl.AddSelection("Hitbox Set", (hitboxSet, i) =>
                    {
                        if (i == 0)
                        {
                            hitboxSetSceneNode.SetHitboxSet(null);
                        }
                        else
                        {
                            hitboxSetSceneNode.SetHitboxSet(hitboxSet);
                        }
                    });
                    hitboxComboBox.Items.Add("");
                    hitboxComboBox.Items.AddRange([.. hitboxSets.Keys]);
                }

                var lodInfo = model.LodInfo;
                var lodCount = lodInfo.LevelCount;

                if (lodInfo.HasDistinctLevels)
                {
                    hasSelectableLods = true;

                    using var _ = UiControl.BeginGroup("Model");

                    lodComboBox = UiControl.AddSelection("Level of Detail", (_, i) =>
                    {
                        if (i < 0)
                        {
                            return;
                        }

                        using var lockedGl = MakeCurrent();
                        // Index 0 is Auto; everything below it maps straight to a LoD level.
                        modelSceneNode?.SetOverrideLod(i == 0 ? null : i - 1);
                    });

                    lodComboBox.Items.Add("Auto");

                    for (var level = 0; level < lodCount; level++)
                    {
                        lodComboBox.Items.Add(FormatLodEntry(lodInfo, level));
                    }

                    lodComboBox.SelectedIndex = 0;
                }

                var meshGroups = modelSceneNode.GetMeshGroups().ToArray<object>();

                if (meshGroups.Length > 1)
                {
                    using var _ = UiControl.BeginGroup("Model");

                    meshGroupListBox = UiControl.AddMultiSelection("Mesh Group", listBox =>
                    {
                        listBox.Items.AddRange(meshGroups);

                        foreach (var group in modelSceneNode.GetActiveMeshGroups())
                        {
                            listBox.SetItemChecked(listBox.FindStringExact(group), true);
                        }
                    }, groups =>
                    {
                        using var lockedGl = MakeCurrent();
                        modelSceneNode.SetActiveMeshGroups(groups);
                        modelStatsDirty = true;
                    });
                }

                var materialGroupNames = model.GetMaterialGroups().Select(group => group.Name).ToArray<object>();

                if (materialGroupNames.Length > 1)
                {
                    using var _ = UiControl.BeginGroup("Model");

                    materialGroupListBox = UiControl.AddSelection("Material Group", (selectedGroup, _) =>
                    {
                        using var lockedGl = MakeCurrent();
                        modelSceneNode?.SetMaterialGroup(selectedGroup);
                        modelStatsDirty = true;
                    });

                    materialGroupListBox.Items.AddRange(materialGroupNames);
                    materialGroupListBox.SelectedIndex = 0;
                }
            }

            if (phys != null)
            {
                var physSceneNodes = Scene.AllNodes.OfType<PhysSceneNode>().ToList();

                // Physics are not shown by default unless the model has no meshes
                var enabledAllPhysByDefault = modelSceneNode == null || modelSceneNode.RenderableMeshes.Count == 0;

                var physicsGroups = physSceneNodes
                    .Select(r => r.PhysGroupName)
                    .Distinct()
                    .OrderByDescending(static s => s.StartsWith('-'))
                    .ThenBy(static s => s)
                    .ToArray();

                if (physicsGroups.Length > 0)
                {
                    physicsGroupsComboBox = UiControl.AddMultiSelection("Physics Groups", (listBox) =>
                    {
                        if (!enabledAllPhysByDefault)
                        {
                            listBox.Items.AddRange(physicsGroups);
                            return;
                        }

                        listBox.BeginUpdate();

                        foreach (var physGroup in physicsGroups)
                        {
                            listBox.Items.Add(physGroup, true);
                        }

                        listBox.EndUpdate();
                    }, (enabledPhysicsGroups) =>
                    {
                        SetEnabledPhysicsGroups(enabledPhysicsGroups.ToHashSet());
                    });
                }
            }

            base.AddUiControls();
        }

        protected void SetAnimationControllerUpdateHandler()
        {
            Debug.Assert(animationController != null);
            Debug.Assert(animationTrackBar != null);
            Debug.Assert(animationPlayPause != null);
            Debug.Assert(slowmodeTrackBar != null);
            Debug.Assert(animationTimeLabel != null);

            void UiAnimationHandler(Animation? animation, int frame)
            {
                if (frame == -1)
                {
                    var maximum = animation == null ? 1 : animation.FrameCount - 1;
                    if (maximum < 0)
                    {
                        maximum = 0;
                    }

                    animationTrackBar.Enabled = animation != null;
                    animationPlayPause.Enabled = animation != null;
                    slowmodeTrackBar.Enabled = animation != null;

                    frame = 0;
                }
                else if (animation is { CycleFrames: > 0 } && animationPlayPause.Checked
                    && (int)MathF.Round(animationTrackBar.Slider.Value * animation.CycleFrames) != frame)
                {
                    animationTrackBar.Slider.Value = (float)frame / animation.CycleFrames;
                }

                if (animationController.ActiveAnimation == null)
                {
                    animationTimeLabel.Text = string.Empty;
                    return;
                }

                var activeAnimation = animationController.ActiveAnimation;
                var frameCount = activeAnimation.FrameCount;
                var fps = activeAnimation.Fps;
                var totalTime = activeAnimation.Duration;
                var (cycle, _, _) = activeAnimation.GetCyclePosition(animationController.Time);
                var time = animationController.Time - cycle * totalTime;
                var frameNumber = animationController.Frame + 1;

                animationTimeLabel.Text = $"Frame: {frameNumber,4} / {frameCount}\n" +
                    $"Time: {time:F2} / {totalTime:F2}\n" +
                    $"FPS: {fps:F2}\n";
            }

            void UpdateUiAnimationState(Animation? animation, int frame)
            {
                if (animationTrackBar.InvokeRequired)
                {
                    animationTrackBar.BeginInvoke(() => UiAnimationHandler(animation, frame));
                }
                else
                {
                    UiAnimationHandler(animation, frame);
                }
            }
            animationController.RegisterUpdateHandler(UpdateUiAnimationState);
        }

        private string GetModelStatsText()
        {
            Debug.Assert(modelSceneNode != null);

            var sb = new System.Text.StringBuilder();

            if (hasSelectableLods)
            {
                sb.AppendLine(GetActiveLodText());
            }

            sb.AppendLine(CultureInfo.InvariantCulture, $"Mesh Count: {modelSceneNode.RenderableMeshes.Count}");

            foreach (var mesh in modelSceneNode.RenderableMeshes)
            {
                var meshName = mesh.Name.Split(":")[^1];
                var size = mesh.BoundingBox.Max - mesh.BoundingBox.Min;

                var vertexTotal = 0;
                var triangleTotal = 0;
                var vertexBufferSize = 0;
                var indexBufferSize = 0;

                var coloredMaterialNames = new List<string>();

                void AddColoredMaterialName(DrawCall call)
                {
                    var tintHex = Color32.FromVector4(call.TintColor).HexCode;
                    coloredMaterialNames.Add($"\\{tintHex}{Path.GetFileNameWithoutExtension(call.Material.Material.Name)}");
                }

                foreach (var draw in mesh.DrawCalls)
                {
                    AddColoredMaterialName(draw);
                    vertexTotal += (int)draw.VertexCount;
                    triangleTotal += draw.IndexCount / 3;
                    vertexBufferSize += (int)(draw.VertexCount * draw.VertexBuffers.Sum(vb => vb.ElementSizeInBytes));
                    indexBufferSize += draw.IndexCount * draw.IndexSizeInBytes;
                }

                var moreThanSixEllipsis = coloredMaterialNames.Count > 6 ? "..." : string.Empty;
                var allColoredMaterials = string.Join("\\#FFFFFFFF, ", coloredMaterialNames.Take(6)) + "\\#FFFFFFFF" + moreThanSixEllipsis;

                sb.Append(CultureInfo.InvariantCulture,
                    $"""

                    Mesh '{meshName}':
                        Vertices  : {vertexTotal:N0} | {HumanReadableByteSizeFormatter.Format(vertexBufferSize)}
                        Triangles : {triangleTotal:N0} | {HumanReadableByteSizeFormatter.Format(indexBufferSize)}

                    """
                );

                if (mesh.Meshlets.Count > 0)
                {
                    var trianglesPerMeshlet = mesh.Meshlets[0].TriangleCount == 0
                        ? (uint)triangleTotal / mesh.Meshlets.Count
                        : mesh.Meshlets[0].TriangleCount;
                    sb.AppendLine(CultureInfo.InvariantCulture, $"    Meshlets  : {mesh.Meshlets.Count:N0} | {trianglesPerMeshlet:N0} triangles each");
                }

                if (mesh.MeshBoneCount > 0)
                {
                    sb.AppendLine(CultureInfo.InvariantCulture, $"    Skinning  : {mesh.MeshBoneCount} bones, {mesh.BoneWeightCount} per vertex");
                }

                sb.AppendLine(CultureInfo.InvariantCulture, $"    Drawcalls : {coloredMaterialNames.Count} ({allColoredMaterials})");
                sb.AppendLine(CultureInfo.InvariantCulture, $"    Size      : X: {size.X:0.##} | Y: {size.Y:0.##} | Z: {size.Z:0.##}");
                sb.AppendLine();
            }

            return sb.ToString();
        }

        private void SetEnabledPhysicsGroups(HashSet<string> physicsGroups)
        {
            foreach (var physNode in Scene.AllNodes.OfType<PhysSceneNode>())
            {
                physNode.Enabled = physicsGroups.Contains(physNode.PhysGroupName);
            }

            using var lockedGl = MakeCurrent();

            Scene.UpdateOctrees();
            SkyboxScene?.UpdateOctrees();
        }

        private Matrix4x4 rootMotionBase = Matrix4x4.Identity;
        private Matrix4x4 rootMotionTotal = Matrix4x4.Identity;

        private Vector3 rootMotionCameraOffset;

        private bool rootMotionLatched;
        private bool rootMotionResetPending;
        private bool enableRootMotion;

        /// <summary>
        /// Builds a dropdown label for one LoD level: "LOD n (Empty)" if the level has no meshes,
        /// otherwise "LOD n" plus the range it's active over, like "LOD 2 (10-15)" or "LOD 4 (20+)".
        /// The range is omitted when the model has no switch data.
        /// </summary>
        private static string FormatLodEntry(ModelLodInfo lodInfo, int level)
        {
            if (!lodInfo.AvailableLevels.Contains(level))
            {
                return $"LOD {level} (Empty)";
            }

            if (lodInfo.SwitchDistances.Count <= 1 || level >= lodInfo.SwitchDistances.Count)
            {
                return $"LOD {level}";
            }

            var (min, max) = lodInfo.GetMetricRange(level);
            var minText = min.ToString("0.#", CultureInfo.InvariantCulture);

            return max is float upper
                ? $"LOD {level} ({minText}-{upper.ToString("0.#", CultureInfo.InvariantCulture)})"
                : $"LOD {level} ({minText}+)";
        }

        /// <summary>
        /// Walks the model and the camera along the root motion the player advanced through since the last
        /// frame. The player unrolls looping, and reports no motion when playback did not advance.
        /// </summary>
        private void UpdateRootMotion()
        {
            if (!enableRootMotion || animationController == null)
            {
                return;
            }

            var delta = animationController.ConsumeRootMotionDelta();

            if (delta.IsIdentity)
            {
                return;
            }

            if (!rootMotionLatched)
            {
                rootMotionBase = modelSceneNode?.Transform ?? skeletonSceneNode?.Transform ?? Matrix4x4.Identity;
                rootMotionTotal = Matrix4x4.Identity;
                rootMotionCameraOffset = Vector3.Zero;
                rootMotionLatched = true;
            }

            var previousTranslation = (rootMotionTotal * rootMotionBase).Translation;

            rootMotionTotal *= delta;

            var transform = rootMotionTotal * rootMotionBase;

            MoveRootMotionCamera(transform.Translation - previousTranslation);
            SetRootMotionTransform(transform);
        }

        /// <summary>
        /// Returns the model and the camera to where root motion picked them up.
        /// </summary>
        private void ResetRootMotion()
        {
            if (rootMotionLatched)
            {
                SetRootMotionTransform(rootMotionBase);
                MoveRootMotionCamera(-rootMotionCameraOffset);
            }

            // Discard motion banked up while nothing was consuming it.
            animationController?.ConsumeRootMotionDelta();

            rootMotionTotal = Matrix4x4.Identity;
            rootMotionCameraOffset = Vector3.Zero;
            rootMotionLatched = false;
        }

        /// <summary>
        /// Places the animated nodes at <paramref name="transform"/>, keeping the dynamic octree in step.
        /// </summary>
        private void SetRootMotionTransform(Matrix4x4 transform)
        {
            static void Move(SceneNode? node, Matrix4x4 transform)
            {
                if (node == null)
                {
                    return;
                }

                node.Transform = transform;
                node.Scene.DynamicOctree.Update(node);
            }

            Move(modelSceneNode, transform);
            Move(skeletonSceneNode, transform);
        }

        /// <summary>
        /// Carries the camera along with the model, keeping any orbit anchor pinned to it.
        /// </summary>
        private void MoveRootMotionCamera(Vector3 delta)
        {
            Input.Camera.Location += delta;

            if (Input.OrbitTarget is Vector3 orbitTarget)
            {
                Input.OrbitTarget = orbitTarget + delta;
            }

            // The input tick is skipped while the cursor is over the side panel, and it is what commits the camera.
            Input.ForceUpdate = true;

            rootMotionCameraOffset += delta;
        }

        /// <summary>
        /// Placed ahead of the input tick, which commits the camera. Any later and the model would move this
        /// frame but the camera only on the next one.
        /// </summary>
        protected override void OnUpdate(float frameTime)
        {
            if (rootMotionResetPending)
            {
                rootMotionResetPending = false;
                ResetRootMotion();
            }

            UpdateRootMotion();

            base.OnUpdate(frameTime);
        }

        protected unsafe override void OnPaint(float frameTime)
        {
            elapsedTime += frameTime;

            

            var dev = RenderDevice ?? throw new InvalidOperationException("Vulkan device not initialized");

            // Create synchronization primitives for single-frame-in-flight (lazy init)
            if (!fence.HasValue)
            {
                fence = dev.CreateFence(true);
                imageAvailableSemaphore = dev.CreateSemaphore();
            }

            // Wait for previous frame to finish before reusing resources
            dev.WaitForFences(fence.Value, true);

            var swapchain = GLControl!.Swapchain;

            if (swapchain.IsOutOfDate)
            {
                dev.WaitDeviceIdle();

                var size = GLControl!.ClientSize;

                if (size.Width == 0 || size.Height == 0)
                    return;

                swapchain.Recreate((uint)size.Width, (uint)size.Height);

                depthImage?.Destroy(); // or however this RHI wrapper releases GPU resources
                depthImage = new Image(swapchain.Extent.width, swapchain.Extent.height, VkFormat.D32Sfloat, 1, 1, VkImageUsageFlags.DepthStencilAttachment);
            }

            var currentImageIndex = swapchain.AcquireNextImage(imageAvailableSemaphore);

            // Skip rendering if swapchain is out of date (will be recreated on next frame)
            if (swapchain.IsOutOfDate)
            {
                return;
            }
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
                dev.ResetFences(fence!.Value);
                textureUploaded = true;
            }

            // Update uniform buffer with view and projection matrices
            if (pipeline != null && uniformBuffer != null)
            {
                Renderer?.Camera?.RecalculateMatrices();

                var viewMatrix = Renderer?.Camera?.CameraViewMatrix;
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

                var descHandle = textureImage.DescriptorHandle;

                DescriptorHandle<ValveResourceFormat.Renderer2.RHI.Texture>* mappedDesc = (DescriptorHandle<ValveResourceFormat.Renderer2.RHI.Texture>*)((byte*)mapped + 256);

                *mappedDesc = textureImage.DescriptorHandle;

                uniformBuffer.Unmap();
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

            commandList.ClearSwapchainImage(image, new VkClearColorValue(0.15f, 0.1f, 0.13f, 1.0f));
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

            //// The stats overlay reflects whatever meshes are currently drawn, so it only needs rebuilding
            //// when that set changes (a LoD switch, or a mesh/material group change), not every frame.
            if (modelSceneNode != null && SelectedNodeRenderer != null)
            //{
            //    if (!SelectedNodeRenderer.HasSelectedNodes)
            //    {
            //        if (modelStatsPosted)
            //        {
            //            SelectedNodeRenderer.ScreenDebugText = string.Empty;
            //            modelStatsPosted = false;
            //            modelStatsDirty = true;
            //        }
            //    }
            //    else
            //    {
            //        if (modelSceneNode.ActiveLod != statsLod)
            //        {
            //            statsLod = modelSceneNode.ActiveLod;
            //            modelStatsDirty = true;
            //        }

            //        if (modelStatsDirty)
            //        {
            //            SelectedNodeRenderer.ScreenDebugText = GetModelStatsText();
            //            modelStatsDirty = false;
            //            modelStatsPosted = true;
            //        }
            //    }
            //}

            //// Always show the active level in the corner. Skip it while paused, where the corner is
            //// taken over by the "Paused" text.
            //if (hasSelectableLods && modelSceneNode != null && !Paused)
            //{
            //    DrawLowerCornerText(GetActiveLodText(), Color32.White, lineFromBottom: 1);
            //}

            //base.OnPaint(frameTime);
        }

        /// <summary>Active level as overlay text: "LOD: Auto (2)" while auto-selecting, "LOD: 2" when forced.</summary>
        private string GetActiveLodText()
        {
            Debug.Assert(modelSceneNode != null);

            return modelSceneNode.IsAutoLod
                ? $"LOD: Auto ({modelSceneNode.ActiveLod})"
                : $"LOD: {modelSceneNode.ActiveLod}";
        }

        protected override void OnPicked(object? sender, PickingTexture.PickingResponse pickingResponse)
        {
            if (modelSceneNode == null)
            {
                return;
            }

            Debug.Assert(SelectedNodeRenderer != null);

            // Void
            if (pickingResponse.PixelInfo.ObjectId == 0)
            {
                SelectedNodeRenderer.SelectNode(null);
                return;
            }

            if (pickingResponse.Intent == PickingTexture.PickingIntent.Select)
            {
                var sceneNode = Scene.Find(pickingResponse.PixelInfo.ObjectId);
                SelectedNodeRenderer.SelectNode(sceneNode);
                modelStatsDirty = true;
                return;
            }

            if (pickingResponse.Intent == PickingTexture.PickingIntent.Open)
            {
                var refMesh = modelSceneNode.GetReferenceMeshes().FirstOrDefault(x => x.MeshIndex == pickingResponse.PixelInfo.MeshId);
                if (refMesh.MeshName != null)
                {
                    var foundFile = GuiContext.FindFileWithContext(refMesh.MeshName + GameFileLoader.CompiledFileSuffix);
                    if (foundFile.Context != null)
                    {
                        foundFile.Context.GLPostLoadAction = (viewerControl) =>
                        {
                            if (viewerControl is GLSceneViewer sceneViewer)
                            {
                                sceneViewer.Input.Camera.CopyFrom(Renderer.Camera);
                            }
                        };

                        Program.MainForm.OpenFile(foundFile.Context, foundFile.PackageEntry);
                    }
                }
            }
        }

        private void SetAvailableAnimations(string[] animations)
        {
            Debug.Assert(animationComboBox != null);

            animationIndexMap.Clear();

            animationComboBox.BeginUpdate();
            animationComboBox.Items.Clear();

            if (animations.Length > 0)
            {
                animationComboBox.Enabled = true;
                animationComboBox.Items.Add($"({animations.Length} animations available)");
                animationIndexMap.Add(null);

                var animationToFolder = model?.GetFaceposerFolders() ?? [];

                // Add ag2 folders
                foreach (var anim in animations)
                {
                    if (!animationToFolder.ContainsKey(anim))
                    {
                        animationToFolder[anim] = (Path.GetDirectoryName(anim) ?? string.Empty).Replace('\\', '/');
                    }
                }

                if (animationToFolder.Count > 0)
                {
                    var folderGroups = animations
                        .GroupBy(anim => animationToFolder.GetValueOrDefault(anim, string.Empty))
                        .ToList();

                    var groupedFolders = folderGroups
                        .Where(g => !string.IsNullOrEmpty(g.Key))
                        .OrderBy(g => g.Key);

                    var ungroupedAnimations = folderGroups
                        .Where(g => string.IsNullOrEmpty(g.Key))
                        .SelectMany(g => g)
                        .OrderBy(a => a)
                        .ToList();

                    foreach (var folderGroup in groupedFolders)
                    {
                        animationComboBox.Items.Add(new ThemedComboBoxItem
                        {
                            Text = folderGroup.Key,
                            IsHeader = true
                        });
                        animationIndexMap.Add(null);

                        foreach (var anim in folderGroup.OrderBy(a => a))
                        {
                            var displayName = Path.GetFileNameWithoutExtension(anim);
                            animationComboBox.Items.Add(new ThemedComboBoxItem
                            {
                                Text = displayName,
                                IsHeader = false
                            });
                            animationIndexMap.Add(anim);
                        }
                    }

                    if (ungroupedAnimations.Count > 0)
                    {
                        animationComboBox.Items.Add(new ThemedComboBoxItem
                        {
                            Text = "Ungrouped",
                            IsHeader = true
                        });
                        animationIndexMap.Add(null);

                        foreach (var anim in ungroupedAnimations)
                        {
                            var displayName = Path.GetFileNameWithoutExtension(anim);
                            animationComboBox.Items.Add(new ThemedComboBoxItem
                            {
                                Text = displayName,
                                IsHeader = false
                            });
                            animationIndexMap.Add(anim);
                        }
                    }
                }
                else
                {
                    animationComboBox.Items.AddRange(animations);
                    animationIndexMap.AddRange(animations);
                }

                animationComboBoxCurrentIndex = -10;
                animationComboBox.SelectedIndex = 0;
            }
            else
            {
                animationComboBox.Items.Add("(no animations available)");
                animationComboBox.SelectedIndex = 0;
                animationComboBox.Enabled = false;
            }

            animationComboBox.EndUpdate();
        }
    }
}
