using GUI.Utils;
using ValveResourceFormat;
using ValveResourceFormat.Renderer2;
//using ValveResourceFormat.Renderer.SceneEnvironment;

namespace GUI.Types.GLViewers
{
    class GLSkyboxViewer : GLSceneViewer
    {
        private readonly Resource materialResource;

        public GLSkyboxViewer(VrfGuiContext vrfGuiContext, RendererContext rendererContext, Resource material)
            : base(vrfGuiContext, rendererContext, Frustum.CreateEmpty())
        {
            materialResource = material;
        }

        protected override void AddUiControls()
        {
            AddRenderModeSelectionControl();

            base.AddUiControls();
        }

        protected override void LoadScene()
        {
            //VKTODO:
            //Renderer.Skybox2D = new SceneSkybox2D(Scene.RendererContext.MaterialLoader.LoadMaterial(materialResource));
        }
        //VKTODO:
        //protected override void OnPicked(object? sender, PickingTexture.PickingResponse pixelInfo)
        //{
        //}
    }
}
