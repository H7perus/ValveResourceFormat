using System;
using System.Collections.Generic;
using System.Text;
using ValveResourceFormat.CompiledShader;
using ValveResourceFormat.Renderer2.RHI;
using ValveResourceFormat.Renderer2.SceneNodes;
using Vortice.Vulkan;

namespace ValveResourceFormat.Renderer2;

public class Scene
{
    /// <summary>Which pass of the frame an update belongs to.</summary>
    public enum UpdatePhase
    {
        /// <summary>One node at a time, in scene order.</summary>
        Place,

        /// <summary>Across the thread pool. Touch only what the node owns.</summary>
        Simulate,

        /// <summary>Finish work done on simulate. Back on the calling thread.</summary>
        Act,
    }

    /// <summary>
    /// Context data passed to scene nodes during per-frame update.
    /// </summary>
    public readonly struct UpdateContext
    {
        /// <summary>Gets which pass of the frame this update is.</summary>
        public UpdatePhase Phase { get; init; }

        /// <summary>Gets the camera used for view-dependent node updates.</summary>
        public required Camera Camera { get; init; }

        /// <summary>Gets the text renderer available for nodes that need to draw labels.</summary>
        //VKTODO: public required TextRenderer TextRenderer { get; init; }

        /// <summary>Gets the elapsed time in seconds since the last update.</summary>
        public required float Timestep { get; init; }

        /// <summary> Gets the renderer's total elapsed time in seconds.</summary>
        public float Uptime { get; init; }
    }


    //VKTEMP:
    public RendererContext RendererContext;

    /// <summary>Gets the octree used to spatially partition static scene nodes.</summary>
    public Octree StaticOctree { get; }

    /// <summary>Gets the flat spatial set holding dynamic scene nodes.</summary>
    public SpatialNodeSet DynamicOctree { get; } = new();

    /// <summary>Gets all static and dynamic scene nodes in the order they were added.</summary>
    public IEnumerable<SceneNode> AllNodes => staticNodes.Concat(dynamicNodes);
    private readonly List<SceneNode> staticNodes = [];
    private readonly List<SceneNode> dynamicNodes = [];

    /// <summary>Gets the render attribute overrides applied to all draw calls in this scene.</summary>
    public Dictionary<string, byte> RenderAttributes { get; } = [];

    public Scene(RendererContext context, float sizeHint = 32768)
    {
        RendererContext = context;
        StaticOctree = new(sizeHint);

        //VKTODO:
        //LightingInfo = new(this);
        //LightBinner = new(this);
        //EntitySystem = new(this);
    }

    public void Add(SceneNode node, bool dynamic)
    {
        if (dynamic)
        {
            dynamicNodes.Add(node);
            DynamicOctree.Dirty = true;
        }
        else
        {
            staticNodes.Add(node);
            StaticOctree.Dirty = true;
        }
    }

    /// <summary>
    /// Renders the opaque pass, optionally with a depth prepass, followed by aggregate indirect draws and static overlay geometry.
    /// </summary>
    /// <param name="renderContext">The render context for this pass.</param>
    /// <param name="depthOnlyShader">Optional depth-only shader; <see langword="null"/> for a pass that replaces material shaders.</param>
    //VKTODO: The inputs need considering.
    public void RenderOpaqueLayer(ViewContext viewContext, CommandList cmd)
    {
        var camera = viewContext.Camera;

        //using (new GLDebugGroup("Opaque Render"))
        //{
        //MeshBatchRenderer.Render(renderLists[renderContext.RenderPass], renderContext);
        //}

        foreach (var node in dynamicNodes)
        {
            if (node is ModelSceneNode modelNode)
            {
                foreach (var renderableMesh in modelNode.RenderableMeshes)
                {
                    foreach (var drawCall in renderableMesh.DrawCallsOpaque)
                    {
                        cmd.BindGraphicsPipeline(drawCall.Material.Pipeline);

                        cmd.BindVertexBuffer(drawCall.VertexBuffers[0]);

                        cmd.BindIndexBuffer(drawCall.IndexBuffer, VkIndexType.Uint16);

                        cmd.DrawIndexed((uint)drawCall.IndexCount, 1, (uint)drawCall.StartIndex / 2, drawCall.VertexOffset, 0);
                    }
                }
            }
        }

    }
}
