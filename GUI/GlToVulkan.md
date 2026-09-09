# GL to Vulkan — Conceptual Changes

This file tracks the high-level architectural shifts needed when moving the GUI from OpenGL to Vulkan. It is intentionally conceptual, not code-level.

---

## 1. Windowing / Embedding Model

### Current (GL)

The fundamental problem: OpenGL requires an OS-native window to create a rendering context and swapchain, but WinForms controls are not themselves capable of holding an OpenGL context. There is no API like "render into this Control's HDC" — OpenGL contexts are tied to full OS windows.

So the architecture works by creating a **separate hidden GLFW window** (Window A) that exists independently on the desktop, then forcibly moving it to sit inside a WinForms control (Window B). This is not embedding in any conventional sense — it's window theft.

The reparenting sequence:

1. **Create a tiny hidden GLFW window.** A 4x4 pixel window with no border, no title bar, no input, completely invisible. It has its own HWND allocated by Windows and an OpenGL context bound to it.

2. **Wait for the WinForms control's handle to exist.** The GLControl is a regular WinForms `Control` — it gets an HWND when WinForms creates its window. Until that happens, there's nothing to reparent into.

3. **Strip all styles from the GLFW window.** Using `SetWindowLongPtr(GWL_STYLE)`, every style bit is removed and only `WS_CHILD | WS_DISABLED` remains. This means:
   - No `WS_POPUP` — it's no longer a top-level window, it's now owned by another window.
   - No `WS_BORDER`, `WS_CAPTION`, `WS_THICKFRAME` — no visual chrome whatsoever.
   - `WS_DISABLED` — the window cannot receive mouse or keyboard input natively. All input must be handled by the parent control via WinForms message filtering.

4. **Strip all extended styles.** Using `SetWindowLongPtr(GWL_EXSTYLE)`, only `WS_EX_NOACTIVATE` remains. This prevents Windows from giving the GLFW window focus when it appears, which would break tab navigation and keyboard input to other controls.

5. **Call `SetParent(hWnd, control.Handle)`** — this is the actual reparenting. The GLFW window's HWND is now a child of the WinForms control's HWND. Windows treats it as part of that control's client area from this point forward.

6. **Resize to match.** When the WinForms control resizes, the GLFW window's `ClientRectangle` is updated to match. The OS automatically repositions and resizes child windows when their parent changes size.

**What you see:** OpenGL rendering inside a tab panel, exactly where the control is positioned. It looks like native WinForms rendering.

**What's actually happening:** A separate OS window with its own HWND, OpenGL context, and swapchain is sitting on top of (and perfectly aligned with) the WinForms control. The control underneath is essentially a placeholder that tells Windows "this is where my stolen window should live." It has no OpenGL capabilities itself — it just holds the reparented window in place.

**Why this is fragile:**
- `SetWindowLong` on style bits after creation is not officially supported behavior. It works because Win32 happens to allow it, but it's undefined-behavior adjacent.
- The `WS_DISABLED` style means the GLFW window is blind and deaf — all mouse/keyboard input goes through WinForms message hooks (`IMessageFilter.PreFilterMessage`) and raw GLFW mouse motion APIs, not native window messages.
- Fullscreen mode (F11) does the same thing in reverse: creates a borderless maximized Form, moves the GLControl into it with `Controls.Add()`, which triggers another reparenting cycle. The GLFW window physically moves from one WinForms container to another.
- macOS path is completely different (`BeginInvoke` resize dance), and Linux isn't supported at all.

### Target (Vulkan)

With Vulkan, the entire reparenting mechanism disappears because you don't need a separate OS window for rendering. The swapchain surface is created directly against the WinForms control's existing HWND — no stealing, no style manipulation, no `SetParent`.

The sequence becomes:

1. **Use the WinForms control's HWND as the surface.** When the control's handle is created (`OnHandleCreated`), create a Vulkan swapchain targeting that exact HWND via `vkCreateWin32SurfaceKHR` (or whatever platform-specific surface API you use).

2. **No reparenting, no style stripping.** The window was never separate — it *is* the control's window. All its existing styles (`WS_CHILD`, input handling, focus behavior) remain untouched.

3. **Input works natively.** Since there's no `WS_DISABLED` window to deal with, mouse and keyboard messages flow through normal WinForms channels. No message filtering hacks needed for basic input.

4. **Fullscreen is a swapchain recreation, not a container move.** Going fullscreen means destroying the current swapchain and creating a new one against either the control's HWND (borderless windowed) or a dedicated fullscreen HWND via platform APIs. The surface stays where it is — no moving windows between containers.

**What you see:** Identical to GL — rendering inside a tab panel, exactly where the control is positioned.

**What's actually happening:** The WinForms control's own HWND has a Vulkan swapchain attached to it. Rendering goes directly into that surface. There is no "other window" — just one window doing both UI hosting and GPU rendering.

**Why this is cleaner:**
- No undefined-behavior style manipulation. The window keeps its original styles.
- Input works through normal WinForms channels — no `WS_DISABLED` bypass needed.
- Fullscreen doesn't require moving windows between containers.
- Single HWND per viewer instead of two (control + GLFW window).
- Platform-specific surface creation is a one-time setup, not a runtime reparenting dance.

---

## 2. Context / Thread Model

### Current (GL)

OpenGL has a **per-thread "current context" model**. An OpenGL context is not just a set of state — it's bound to the thread that made it current, and only one thread can have a context current at any given time. This means:

- Only one thread can issue GL commands at a time.
- The context must be explicitly "made current" on a thread before that thread can call any GL function.
- You release it from a thread with `MakeNoneCurrent`, and make it current on another thread with `MakeCurrent`.
- OpenGL contexts cannot exist without an OS window — they require a drawing surface allocated by the OS (the GLFW window's HWND).

This creates a **multi-threaded dance** in the GUI:

1. **UI thread creates the GLFW window.** This is mandatory because Win32 has strict rules: only the thread that created a window can manipulate it (`SetParent`, `SetWindowLongPtr`). These APIs send synchronous messages to the owning thread, so if you try to call them from another thread, you deadlock.

2. **The OpenGL context is automatically made current on the UI thread** when the window is created.

3. **UI thread releases the context** with `MakeNoneCurrent()`. The context is now unbound from any thread — it's in limbo, ready to be picked up by another thread.

4. **Background thread makes the context current** and loads all GL resources (textures, shaders, VBOs). This is the slow part that would block the UI if done on the UI thread.

5. **Background thread releases the context.**

6. **UI thread makes it current again**, creates the WinForms controls, reparents the window, and starts rendering.

This entire sequence exists because OpenGL couples a drawing surface (the OS window) to a per-thread binding model. You can't load resources on one thread without explicitly transferring context ownership back and forth.

The comment in `GLBaseControl.InitializeLoadCore()` documents every failed attempt before this settled: background thread creates + UI reparents (deadlock), background invokes to UI for parent handle (deadlock), two windows with shared contexts (black screens). The current solution works because window operations happen on the creating thread, but context operations can hop between threads as long as only one thread holds it at a time.

### Target (Vulkan)

Vulkan has **no "current context" concept**. There is no per-thread binding model. Instead:

- A `VkDevice` and its command queues are global resources that any thread can submit to, with external synchronization (semaphores, fences).
- Command buffers are recorded independently of which thread submits them.
- There's no need to "make something current" before issuing commands — you just record into a buffer and submit it to a queue.

The window/surface is created once against the control's HWND. Rendering happens by recording draw commands into command buffers and submitting them to a `VkQueue`. Any thread can do this work without any per-thread binding gymnastics.

**What disappears:**
- No `MakeCurrent` / `MakeNoneCurrent` dance.
- No context migration between UI thread and background threads.
- No deadlock avoidance for window ownership vs. context ownership.
- The entire 30-line comment in `InitializeLoadCore()` explaining why this multi-threaded gymnastics is necessary becomes irrelevant.

**What remains:**
- You still need synchronization between threads (semaphores/fences) to ensure commands are submitted in the right order and resources aren't accessed concurrently without protection. But this is explicit, fine-grained synchronization — not a coarse "one thread at a time" model imposed by the API.

**Practical impact:**
- Resource loading can happen on any background thread without context migration overhead.
- The render loop thread can record command buffers and submit them directly to a queue.
- No need for `GLLockScope` + `GraphicsContext.Begin()` / `End()` around every GL call — Vulkan's synchronization is managed through semaphores and fences, not per-thread context binding.

---

## 3. Framebuffer / Render Target Model

### Current (GL)

OpenGL framebuffers are **stateful bindings**. You bind one with `glBindFramebuffer`, and all subsequent draw calls target it until you bind another. There's no command buffer — rendering is immediate execution.

The GUI uses two framebuffer concepts:

- **`GLDefaultFramebuffer`** — the native screen framebuffer provided by the OS/windowing system. It has no explicit creation or cleanup; it's tied to the window's back buffer and represents what you see on screen.
- **`MainFramebuffer`** — an offscreen FBO for geometry rendering, configured with `RGBA16161616F` color (HDR) + `D32` depth, with configurable MSAA samples. This is where all scene geometry is drawn first.

At the end of each frame, `MainFramebuffer` is blitted to `GLDefaultFramebuffer` via a single stateful call (`glBlitFramebuffer`). The blit handles layout conversion and resolution in one step — no command buffer management needed.

MSAA works through GL's implicit resolve: you enable multisampling with `glEnable(GL_MULTISAMPLE)`, draw into the FBO, and the driver handles the resolve automatically when you blit or present.

### Target (Vulkan)

Vulkan has **no framebuffer state** in the OpenGL sense. There is no "bind a framebuffer and draw" — everything is explicit and recorded into command buffers ahead of submission.

Dynamic rendering (`vkCmdBeginRendering`) defines attachments inline at the point of use, right before you record draw commands. The attachment list (color images, depth/stencil image) is per-draw, not a precompiled descriptor set. You declare what you're drawing into, and the driver figures out the rest.

Color and depth images are created separately — no single object bundles them together like an FBO. Each image has its own memory allocation, layout transitions, and access patterns managed explicitly through pipeline barriers.

The `MainFramebuffer` → `GLDefaultFramebuffer` blit becomes explicit command buffer work: record a blit command into a command buffer, submit it to the queue, wait on synchronization primitives. No single-call stateful operation.

MSAA resolve is likely a manual `vkCmdBlitImage` rather than an implicit render pass step — the exact mechanism is TBD, but the conceptual shift is the same: explicit over implicit, command buffers over immediate execution.

**Key conceptual shift:** GL framebuffers are persistent bindings you activate and forget. Vulkan attachments are just images you declare in a dynamic rendering call — no binding state, everything recorded into command buffers ahead of submission.

---

## 4. Pixel Readback (Screenshots, Export, Thumbnails)

### Current (GL)
- `glReadPixels` reads directly from the currently bound framebuffer into system memory. Synchronous — blocks until pixels are available.
- Used everywhere: clipboard screenshots, PNG/JPG/EXR export, thumbnail rendering, GPU texture decoder, single-node icon generation.

### Target (Vulkan)
- No synchronous readback API. Requires a staging buffer + command buffer submission to copy from the render target to the staging buffer + fence/signal/wait cycle.
- Every readback site needs restructuring: submit copy command → wait for completion → map staging buffer → read pixels.
- This is likely the largest category of code changes in the GUI, since `ReadPixels` appears in 6+ files with different usage patterns (synchronous vs async, single-shot vs repeated).

---

## 5. SkiaSharp GL Backend (`GLGraphViewer`)

### Current (GL)
- Creates `GRGlInterface.Create()` → `GRContext.CreateGl(glInterface)` → `GrBackendRenderTarget` backed by the current OpenGL framebuffer binding.
- Skia records into its own context, which translates to GL draw calls on the current thread.

### Target (Vulkan)
- Use `SkiaSharp.Vulkan.SharpVk` package for Vulkan support in C# — no software fallback needed.
- Would construct a `GrVkBackendContext` with Vulkan instance/device/queue info and create the Skia context from that instead of `GRGlInterface`.
- The GUI currently doesn't manage those Vulkan handles — they live in the Renderer library. Either the Renderer exposes them, or we need a different integration path.

---

## 6. Input Handling

### Current (GL)
- The reparented GLFW window has `WS_DISABLED` style, so it receives no native input.
- All keyboard/mouse wheel/up/down is intercepted via WinForms message filtering (`IMessageFilter.PreFilterMessage`).
- Raw mouse motion for FPS-style camera look uses GLFW's per-window `CursorState.Grabbed` + `RawMouseInput` — requires an active GLFW window handle.

### Target (Vulkan)
- Raw mouse capture (`CursorState.Grabbed` + `RawMouseInput`) won't be available through GLFW anymore — no reparented window to attach it to.
- Would need WinForms message filtering + Windows raw input API (`RegisterRawInputDevices`, `WM_INPUT`) for equivalent functionality.
- Not a blocker: the long-term plan is SDL + a different UI system, which handles this natively.

---

## 7. Fullscreen Mode (F11)

### Current (GL)
- Creates a borderless maximized Form, then moves the GLControl into it with `Controls.Add()`, triggering another reparenting cycle.
- The GLFW window is physically moved from one WinForms container to another.

### Target (Vulkan)
- Fullscreen would need per-monitor DPI-aware mode switching that doesn't rely on control reparenting.
- Either a dedicated fullscreen form with its own swapchain, or a transition between windowed and fullscreen exclusive modes via platform APIs.
- No more moving the GL surface between containers — it stays anchored to one HWND.

---

## 8. Debug / Validation

### Current (GL)
- `glDebugMessageCallback` + `glDebugMessageControl` for OpenGL debug output.
- Labels objects with `glObjectLabel` for debugging in tools like RenderDoc.

### Target (Vulkan)
- Validation layers provide similar diagnostics via `VK_DEBUG_REPORT_MESSAGE_TYPE_*` callbacks.
- Object naming uses `vkSetDebugUtilsObjectNameEXT`.
- The GUI's existing debug message filtering logic would need to be adapted to Vulkan's validation layer output format.

---

## 9. Query Objects (GPU Timing)

### Current (GL)
- `glBeginQuery(QueryTarget.TimeElapsed)` / `glEndQuery` + `glGetQueryObject` for GPU frame timing.

### Target (Vulkan)
- Timeline semaphores or query buffers (`VkQueryPool`) with `vkCmdBegin/EndQuery` and result retrieval via `vkGetQueryPoolResults`.
- Different synchronization model — no immediate results, requires explicit result retrieval.

---

## 10. Swapchain / Buffer Swap

### Current (GL)
- `glfwSwapBuffers()` on the GLFW window context. Simple one-call present.

### Target (Vulkan)
- `vkQueuePresentKHR` with a `VkPresentInfoKHR` containing the swapchain, image index, and semaphore signaling completion.
- Requires managing acquire/release synchronization via semaphores or fences between rendering and presentation queues.

---

## Open Questions

| Question | Notes |
|----------|-------|
| Will we still use GLFW at all? | If only for window creation (not embedding), many blockers disappear. If eliminated entirely, Win32 native windowing takes over. |
| Does the Renderer library already have a Vulkan backend? | If so, GUI changes are mostly about surface creation and pixel readback abstraction. If not, this is a much larger project. |
| How do we handle multiple viewers simultaneously? | Each viewer currently has its own GLFW window + context. With Vulkan, each would need its own swapchain or a shared swapchain with proper synchronization. |
| What about the thumbnail renderer's offscreen window? | Currently creates a hidden GLFW window for isolated rendering. Would need an offscreen `VkSurfaceKHR` equivalent — possibly just render to images without any surface at all. |
