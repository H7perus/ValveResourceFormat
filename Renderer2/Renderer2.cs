using ValveResourceFormat.Renderer2.RHI;
using Vortice.Vulkan;

namespace ValveResourceFormat.Renderer2;

public class Renderer2
{

    /// <param name="Start">The starting depth value from the viewers perspective. Note: 1.0 = closest.</param>
    /// <param name="End">The ending depth value from the viewers perspective. Note: 0.0 = furthest.</param>
    public record DepthRange(float Start, float End)
    {
        /// <summary>The window-space near value.</summary>
        public float Near { get; } = End;

        /// <summary>The window-space far value.</summary>
        public float Far { get; } = Start;

        /// <summary>The whole window range, for render targets that are not part of the scene.</summary>
        public static readonly DepthRange Full = new(1f, 0f);

        /// <summary>The main scene.</summary>
        public static readonly DepthRange Scene = new(0.95f, 0.05f);

        /// <summary>Reserved for the first-person viewmodel, always in front of the main scene.</summary>
        public static readonly DepthRange Viewmodel = new(1.0f, Scene.Start);

        /// <summary>Reserved for the 3D sky, always behind the main scene.</summary>
        public static readonly DepthRange Sky = new(Scene.End, 0f);
    }

    /// <summary>
    /// The main scene to render.
    /// </summary>
    public Scene Scene { get; set; }

    public CommandList cmd { get; set; }

    public VkFence doneRendering { get; set; }

    public VkSemaphore imageAvailable { get; set; }

    private RHI.Buffer? uniformBuffer;

    /// <summary>
    /// Total time elapsed since the renderer was started, in seconds.
    /// </summary>
    public float Uptime { get; set; }

    /// <summary>
    /// Time elapsed since the last frame, in seconds.
    /// </summary>
    public float DeltaTime { get; set; }

    /// <summary>
    /// Shared renderer context containing loaders and caches.
    /// </summary>
    public RendererContext RendererContext { get; }

    /// <summary>
    /// Initializes a new renderer around a scene
    /// </summary>
    public unsafe Renderer2(RendererContext rendererContext)
    {
        RendererContext = rendererContext;
        //VKTODO:
        //PerfStats = new PerfStats();
        //Postprocess = new(rendererContext);
        //LightTilesOverlay = new(rendererContext);
        //Camera = new Camera(rendererContext.FieldOfView);
        //ViewmodelCamera = new Camera();
        Scene = new Scene(rendererContext);
        cmd = new CommandList(RenderDevice!.QueueFamilyIndices.GraphicsFamily.Value);
        imageAvailable = RenderDevice!.CreateSemaphore();
        doneRendering = RenderDevice!.CreateFence(true);
        uniformBuffer = new RHI.Buffer(256, VkBufferUsageFlags.UniformBuffer, VmaMemoryUsage.GpuToCpu);

    }

    public void Update(float deltaTime)
    {
        Uptime += deltaTime;
    }

    public unsafe void Render(ViewContext viewContext)
    {
        RenderDevice!.WaitForFences(doneRendering);
        

        int currIndex = viewContext.Framebuffer.AcquireNextImage(imageAvailable);

        if (currIndex < 0)
            return;

        RenderDevice!.ResetFences(doneRendering);

        viewContext.Camera.RecalculateMatrices();
        Matrix4x4? viewMatrix = viewContext.Camera.CameraViewMatrix; // * Matrix4x4.Identity; // Renderer?.Camera?.CameraViewMatrix;

        var aspectRatio = (float)viewContext.Framebuffer.Extent.width / viewContext.Framebuffer.Extent.height;
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

        cmd.Begin();
        cmd.ClearSwapchainImage(viewContext.Framebuffer.Images[currIndex], new VkClearColorValue(0.15f, 0.1f, 0.13f, 1.0f));

        cmd.BeginDebugLabel("Opaque Pass");
        cmd.BeginRendering(new RenderingInfo{ colorAttachments = [new() { image = viewContext.Framebuffer.Images[currIndex] }] });

        VkViewport viewport = new() { x = 0, y = 0, width = viewContext.Framebuffer.Extent.width, height = viewContext.Framebuffer.Extent.height, minDepth = 0.0f, maxDepth = 1.0f };
        VkRect2D scissor = new() { extent = viewContext.Framebuffer.Extent, offset = new() };

        cmd.SetViewport(viewport);
        cmd.SetScissor(scissor);

        cmd.PushConstants(uniformBuffer.DescriptorHandle);

        RenderScenesWithView(viewContext);

        cmd.EndRendering();
        cmd.EndDebugLabel();

        cmd.ImageTransitionBarrier(viewContext.Framebuffer.Images[currIndex], VkImageLayout.PresentSrcKHR);
        cmd.End();

        RenderDevice!.SubmitGraphics(cmd, imageAvailable, viewContext.Framebuffer.WriteToImageFinishedSemaphores[currIndex], doneRendering);

        viewContext.Framebuffer.Present(viewContext.Framebuffer.WriteToImageFinishedSemaphores[currIndex]);

    }

    public void RenderScenesWithView(ViewContext viewContext)
    {
        Scene.RenderOpaqueLayer(viewContext, cmd);
    }

    public void LoadRendererResources()
    {

    }
}
