# OpenGL Dependencies in the GUI

This document outlines every layer of OpenGL usage in the `GUI` project, from window creation down to rendering and texture decoding. The GUI depends on **OpenTK** (GLFW + OpenGL bindings) and the **Renderer** library (`ValveResourceFormat.Renderer`) for all GPU work.

---

## 1. Windowing Layer — GLFW via OpenTK

### NativeWindowFactory
- **File:** `Types/GLViewers/NativeWindowFactory.cs`
- Serializes creation and destruction of every `OpenTK.Windowing.Desktop.NativeWindow` through a global lock, because GLFW's lazy WGL initialization is not thread-safe.
- All windows are created hidden (`StartVisible = false`, `StartFocused = false`) with a minimal 4x4 client size to avoid flicker during reparenting.

### GLControl (WinForms host)
- **File:** `Controls/GLControl.cs`
- A custom WinForms `System.Windows.Forms.Control` that wraps an OpenTK `NativeWindow`.
- On Windows it uses Win32 API (`SetParent`, `SetWindowLongPtr`) to reparent the GLFW window as a child of the control, with styles `WS_CHILD | WS_DISABLED` and extended style `WS_EX_NOACTIVATE`.
- macOS path resizes via `BeginInvoke` to avoid ordering issues.
- Exposes an `IGLFWGraphicsContext` through its `Context` property.

### GLFW Provider Initialization
- **File:** `MainForm.cs` (static constructor)
- Installs a global error callback on `GLFWProvider`, disables main-thread checks, and calls `EnsureInitialized()` before any window is created.

---

## 2. OpenGL Context & Surface Abstraction

### GLFWSurface
- **File:** `Types/GLViewers/GLFWSurface.cs`
- Implements `IGraphicsSurface` from the Renderer library. Bridges a GLFW graphics context to the renderer by calling `MakeCurrent()` / `MakeNoneCurrent()`.

### GraphicsContext Creation
- Every viewer creates its context via `RendererContext.Device.CreateContext(new GLFWSurface(nativeWindow.Context))`.
- The context is made current on the UI thread during window creation, then released (`MakeNoneCurrent`) so a background loading thread can make it current. After loading, the UI thread makes it current again for reparenting and control setup.

### GLLockScope
- **File:** `Types/GLViewers/GLLockScope.cs`
- RAII wrapper that acquires the shared `glLock`, then calls `GraphicsContext.Begin()` / `End()`. Ensures only one thread issues GL commands at a time across all viewers and decoders.

---

## 3. Render Loop Architecture

### RenderLoopThread
- **File:** `Types/GLViewers/RenderLoopThread.cs`
- A dedicated background thread that drives the render loop for all active OpenGL controls.
- Uses a `ManualResetEventSlim` signal to wake on UI activation or when new frames are requested.
- Manages which `GLBaseControl` owns the current GL context via `SetCurrentGLControl` / `UnsetCurrentGLControl`.
- Pauses rendering when no control is visible or the app loses focus; resumes on next paint message.

### Paint-to-Loop Binding
- Each viewer registers a handler on its `GLControl.Paint` event (`OnGlControlPaint`) that calls `AttachToRenderLoop()`, which registers the control as the current GL owner and starts the loop thread if needed.

---

## 4. Viewer Base Classes

### GLBaseControl (abstract)
- **File:** `Types/GLViewers/GLBaseControl.cs`
- The root of all OpenGL viewers. Manages:
  - `NativeWindow? GLNativeWindow` — the GLFW window backing this viewer.
  - `GraphicsContext? GraphicsContext` — the renderer's command stream over that window.
  - `RendererContext RendererContext` — shared shader loader, material loader, texture cache, etc.
  - `Framebuffer? GLDefaultFramebuffer` — the native back buffer (screen framebuffer).
  - `Framebuffer? MainFramebuffer` — an offscreen FBO for rendering geometry; resized to viewer dimensions with configurable MSAA samples.
- **OpenGL initialization (`LoadGLResources`):**
  - Loads GLFW bindings via `GL.LoadBindings`.
  - Enables debug output (`GL.Enable(EnableCap.DebugOutput)`) and installs a `DebugMessageCallback`.
  - Initializes `GLEnvironment` (extension loader, default render state).
  - Queries max MSAA samples from the driver.
  - Creates the main FBO with `RGBA16161616F` color + `D32` depth.
- **Input handling:** Intercepts raw window messages (`WM_MOUSEMOVE`, `WM_MOUSEWHEEL`, `WM_KEYDOWN/UP`) via `IMessageFilter.PreFilterMessage` for zero-allocation input at 60+ Hz. Supports raw mouse motion through GLFW's `RawMouseInput` + cursor grab mode.
- **Fullscreen:** Creates a borderless full-screen form on F11, reparents the GL control into it, and restores on escape.
- **Screenshot / clipboard:** Reads pixels from the default framebuffer via `GL.ReadPixels`, flips Y with Skia, and copies to clipboard.

### GLSceneViewer (abstract)
- **File:** `Types/GLViewers/GLSceneViewer.cs`
- Extends `GLBaseControl` for scene-based viewers (worlds, models, animations). Owns:
  - `ValveResourceFormat.Renderer.Renderer Renderer` — the full scene renderer.
  - `UserInput Input` — camera controller with orbit/walk/no-clip modes.
  - `TextRenderer TextRenderer` — HUD / debug text overlay.
  - `PickingTexture? Picker` — object picking via ID render pass.
  - `QuadOverdraw? QuadOverdrawRenderer` — overdraw visualization.
  - `InfiniteGrid baseGrid` — world-space grid lines.
- **Framebuffer usage:** Renders to `MainFramebuffer`, then blits through postprocess (`PostprocessRender`) to `GLDefaultFramebuffer`.
- **Performance queries:** Uses `GL.BeginQuery / EndQuery(QueryTarget.TimeElapsed)` for GPU frame timing.

### GLTextureViewer
- **File:** `Types/GLViewers/GLTextureViewer.cs`
- Extends `GLBaseControl` for texture, image, and SVG viewers.
- Uses the default framebuffer directly (`MainFramebuffer = GLDefaultFramebuffer`) instead of an offscreen FBO.
- Uploads textures via `RenderTexture` (from Renderer), loads a `texture_decode` shader with dynamic type defines (`S_TYPE_TEXTURE2D`, etc.).
- Supports mip level, depth slice, cube face selection, channel splitting, and cubemap equirectangular/cubic projection visualization.
- **Pixel export:** Renders to an intermediate FBO, then calls `GL.ReadPixels` to extract PNG/JPG/EXR.

### GLGraphViewer
- **File:** `Types/GLViewers/GLGraphViewer.cs`
- Extends `GLTextureViewer`. Draws graph visualizations through **SkiaSharp** with a GL backend (`GRContext.CreateGl`).
- Creates a `GRGlInterface`, `GRContext`, and `GRBackendRenderTarget` backed by the current framebuffer binding.
- Resets context between frames to avoid stale GL state in Skia's offscreen composites.

### GLSingleNodeViewer
- **File:** `Types/GLViewers/GLSingleNodeViewer.cs`
- A single-node model viewer that overrides `ReadPixelsToBitmap` to render only main scene nodes into a transparent FBO for icon generation.

---

## 5. GPU Texture Decoder (Background Thread)

### GLTextureDecoder
- **File:** `Types/GLViewers/GLTextureDecoder.cs`
- Runs on its own background thread with a dedicated GLFW window and OpenGL context.
- Accepts decode requests via a `BlockingCollection<DecodeRequest>`.
- For each request: loads the texture through Renderer, renders it to an FBO using the `texture_decode` shader, then reads pixels back via `GL.ReadPixels`.
- Supports both LDR (`RGBA8888`) and HDR (`RGBA32323232F`) output formats.

---

## 6. Thumbnail Rendering (Package Explorer)

### ThumbnailRenderer (abstract base)
- **File:** `Types/PackageViewer/ThumbnailRenderers/ThumbnailRenderer.cs`
- Creates a hidden offscreen GLFW window and full RendererContext for generating preview thumbnails.
- Initializes the renderer, loads default lighting, creates an HDR FBO with 4x MSAA, and renders scene objects to bitmap.

### Thumbnail Model / Material / Particle Renderers
- **Files:** `ThumbnailModelRenderer.cs`, `ThumbnailMaterialRenderer.cs`, `ThumbnailParticleRenderer.cs`
- Specialize `SetResource` to load specific resource types into the shared Renderer instance for thumbnail generation.

---

## 7. OpenGL API Calls Used in GUI

| Category | GL Functions / Enums | Where |
|----------|---------------------|-------|
| **Context** | `GL.LoadBindings`, `GLEnvironment.Initialize`, `GLEnvironment.SetDefaultRenderState` | All viewers, thumbnail renderer, texture decoder |
| **Debug** | `GL.Enable(EnableCap.DebugOutput)`, `GL.DebugMessageCallback`, `GL.DebugMessageControl` | GLBaseControl |
| **Framebuffers** | `Framebuffer.Prepare`, `Framebuffer.Bind`, `Framebuffer.Resize`, `Framebuffer.ClearMask`, `Framebuffer.ClearColor` | All viewers, thumbnail renderer |
| **Textures** | `RenderTexture.Create*`, `GL.TextureSubImage2D/3D`, `GL.TextureParameteri` (filtering/wrap) | GLTextureViewer, GLTextureDecoder |
| **Shaders** | `Shader.Use()`, `shader.SetUniform`, `shader.SetTexture` | All viewers via RendererContext.ShaderLoader |
| **Draw calls** | `GL.DrawArrays`, `GL.BindVertexArray`, `GL.Viewport` | GLSceneViewer (scene render), GLTextureDecoder |
| **Read pixels** | `GL.ReadPixels`, `GL.Flush`, `GL.Finish`, `GL.ReadBuffer` | All viewers, thumbnail renderer, texture decoder |
| **Blit / postprocess** | `Framebuffer.Bind(FramebufferTarget.Read/DrawFramebuffer)`, `PostprocessRender` | GLSceneViewer (final pass), thumbnail renderer |
| **Queries** | `GL.BeginQuery(QueryTarget.TimeElapsed)`, `GL.EndQuery`, `GL.GetQueryObject` | GLSceneViewer (GPU timing) |
| **Clear / state** | `GL.ClearColor`, `GL.Clear`, `GL.Disable(EnableCap.DepthTest)`, `GL.DepthMask` | All viewers, thumbnail renderer |

---

## 8. Renderer Library Integration Points

The GUI depends on these types from `ValveResourceFormat.Renderer`:

| Type | Purpose |
|------|---------|
| `RendererContext` | Central hub: shader loader, material loader, texture cache, mesh buffer cache, logger |
| `Renderer` (scene) | Full scene rendering pipeline: update loop, culling, draw calls, shadow maps, postprocess |
| `Framebuffer` | Offscreen render target with configurable color/depth formats and MSAA |
| `RenderTexture` | GPU texture wrapper for 2D / 3D / cube map textures |
| `Shader` | Compiled shader program with uniform/texture setters |
| `TextRenderer` | HUD text overlay using geometry shaders or indexed quads |
| `GLEnvironment` | Extension loader, default render state setup, preferred framebuffer format selection |
| `IGraphicsSurface` / `IGLFWGraphicsContext` | Abstraction for making a GLFW context current to the renderer |

---

## 9. Control Hierarchy Summary

```
MainForm (WinForms Form)
 └── MainTabs (custom tab control)
      └── TabPage (per file type)
           └── RendererControl (UserControl, split container)
                ├── Panel: glControlContainer (black background)
                │    └── GLControl (reparented GLFW window)
                │         └── [GLBaseControl instance via Tag]
                │              ├── GLSceneViewer  (world/model/animation/etc.)
                │              ├── GLTextureViewer (texture/image/SVG)
                │              └── GLGraphViewer   (graph views, inherits GLTextureViewer)
                └── Panel: controlsPanel (sidebar UI)
                     ├── ThemedGroupBox / CheckBox / ComboBox / Slider
                     └── RendererControl.AddControl() targets here
```

---

## 10. Thread Affinity Rules

| Operation | Required Thread | Reason |
|-----------|----------------|--------|
| Window creation (`NativeWindowFactory.Create`) | UI thread (via `MainForm.Invoke`) | Win32 window ownership; reparenting APIs must run on the creating thread |
| OpenGL context make-current / GL calls | Any thread, but only one at a time | Protected by `glLock` + `GLLockScope`; contexts can move between threads via `MakeCurrent`/`MakeNoneCurrent` |
| Render loop | Dedicated background thread (`RenderLoopThread`) | Drives `control.Draw()` which issues all GL commands for the current viewer |
| Texture decoder | Dedicated background thread (`GLTextureDecoder.GLThread`) | Separate context to avoid blocking viewers during decode |
| Thumbnail rendering | Called from UI thread but makes window current before each render | Reuses a hidden offscreen window; no concurrent GL calls |

---

## 11. Shader Pipeline in GUI Viewers

- Shaders are loaded through `RendererContext.ShaderLoader.LoadShader(name, defines)`.
- The `texture_decode` shader is used by both viewers and the GPU decoder for texture visualization/decoding.
- Scene shaders are compiled from `.slang` files (in the Renderer project) with game-specific `GameVfx_*` defines activated based on the Source 2 VFX name.
- In DEBUG builds, `ShaderHotReload` watches shader source changes and triggers recompilation + VAO rebuild without restarting.

---

## 12. Dependencies Summary

| Dependency | Package / Project | Used By |
|------------|-------------------|---------|
| **OpenTK** (GLFW + OpenGL bindings) | NuGet package | `GLControl`, `NativeWindowFactory`, all viewers, thumbnail renderer, texture decoder, MainForm |
| **ValveResourceFormat.Renderer** | Local project (`ValveResourceFormat/`) | All GL viewers, thumbnail renderers, texture decoder — the entire GPU rendering pipeline |
| **SkiaSharp** | NuGet package | Texture viewer (SVG rasterization), pixel export, graph viewer (GL backend) |
| **Windows.Win32.PInvoke** | Microsoft.Windows.CsWin32 | `GLControl` reparenting (`SetParent`, `SetWindowLongPtr`, `ShowCursor`) |
