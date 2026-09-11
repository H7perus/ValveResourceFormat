using Microsoft.VisualBasic.FileIO;
using System;
using Vortice.Vulkan;

namespace ValveResourceFormat.Renderer2.RHI;


public struct RenderingAttachmentInfo
{
    required public Image image;
    public VkAttachmentLoadOp loadOp = VkAttachmentLoadOp.Load;
    public VkAttachmentStoreOp storeOp = VkAttachmentStoreOp.Store;
    public Image? resolveImage = null;
    public VkResolveModeFlags resolveMode;
    public VkClearValue clearValue = new VkClearValue { color = new VkClearColorValue(0.0f, 0.0f, 0.0f, 1.0f) };

    public RenderingAttachmentInfo()
    { }
}

public struct RenderingInfo
{
    public VkRect2D renderArea;
    public uint layerCount = 1;
    required public RenderingAttachmentInfo[] colorAttachments;
    public RenderingAttachmentInfo? depthAttachment;

    public RenderingInfo() { }
}

unsafe public class CommandList : IDisposable
{
    private readonly VkCommandPool _commandPool;

    public VkCommandBuffer Handle { get; }

    public uint QueueFamilyIndex { get; private set; }

    public CommandList(uint queueFamilyIndex)
    {
        var device = RenderDevice
            ?? throw new InvalidOperationException(
                "S2vDevice has not been initialized.");

        var poolInfo = new VkCommandPoolCreateInfo
        {
            flags = VkCommandPoolCreateFlags.ResetCommandBuffer,
            queueFamilyIndex = queueFamilyIndex
        };

        QueueFamilyIndex = queueFamilyIndex;

        var result = device.VkDeviceApi.vkCreateCommandPool(
            &poolInfo,
            null,
            out _commandPool);

        if (result != VkResult.Success)
            throw new Exception(
                $"Failed to create command pool: {result}");

        var allocInfo = new VkCommandBufferAllocateInfo
        {
            commandPool = _commandPool,
            level = VkCommandBufferLevel.Primary,
            commandBufferCount = 1
        };

        VkCommandBuffer cmdBuff;

        result = device.VkDeviceApi.vkAllocateCommandBuffers(
            &allocInfo,
            &cmdBuff);

        if (result != VkResult.Success)
            throw new Exception(
                $"Failed to allocate command buffer: {result}");

        Handle = cmdBuff;
    }

    public void Begin()
    {
        var device = RenderDevice!;

        device.VkDeviceApi.vkResetCommandBuffer(
            Handle,
            0);

        var beginInfo = new VkCommandBufferBeginInfo
        {
            flags = VkCommandBufferUsageFlags.OneTimeSubmit
        };

        Check(
            device.VkDeviceApi.vkBeginCommandBuffer(
                Handle,
                &beginInfo),
            "vkBeginCommandBuffer");
        if (device.QueueFamilyIndices.GraphicsFamily == QueueFamilyIndex)
            fixed (VkDescriptorSet* pSharedBindlessSet = &RenderDevice.SharedBindlessDescriptorSet)
            {
                RenderDevice!.VkDeviceApi.vkCmdBindDescriptorSets(
                    Handle,
                    pipelineBindPoint: VkPipelineBindPoint.Graphics,
                    layout: RenderDevice.SharedPipelineLayout,
                    firstSet: 1,
                    descriptorSetCount: 1,
                    pSharedBindlessSet,
                    dynamicOffsetCount: 0,
                    dynamicOffsets: null);
                RenderDevice!.VkDeviceApi.vkCmdBindDescriptorSets(
                    Handle,
                    pipelineBindPoint: VkPipelineBindPoint.Compute,
                    layout: RenderDevice.SharedPipelineLayout,
                    firstSet: 1,
                    descriptorSetCount: 1,
                    pSharedBindlessSet,
                    dynamicOffsetCount: 0,
                    dynamicOffsets: null);
            }
    }

    public void ClearSwapchainImage(
        Image image,
        VkClearColorValue color)
    {
        var device = RenderDevice!;
        ImageTransitionBarrier(
            image,
            VkImageLayout.TransferDstOptimal,
            srcBeforeTransition: VkPipelineStageFlags2.AllCommands | VkPipelineStageFlags2.ColorAttachmentOutput,
            dstTransitionBefore: VkPipelineStageFlags2.AllCommands,
            srcMask: VkAccessFlags2.ColorAttachmentWrite | VkAccessFlags2.ShaderWrite | VkAccessFlags2.ColorAttachmentRead | VkAccessFlags2.ShaderRead,
            dstMask: VkAccessFlags2.TransferWrite
            );


        var subresourceRange = new VkImageSubresourceRange
        {
            aspectMask = VkImageAspectFlags.Color,
            baseMipLevel = 0,
            levelCount = 1,
            baseArrayLayer = 0,
            layerCount = 1
        };

        device.VkDeviceApi.vkCmdClearColorImage(
            Handle,
            image.ImageHandle,
            VkImageLayout.TransferDstOptimal,
            &color,
            1,
            &subresourceRange
            );

        ImageTransitionBarrier(
            image,
            VkImageLayout.ColorAttachmentOptimal,
            srcBeforeTransition: VkPipelineStageFlags2.AllCommands,
            dstTransitionBefore: VkPipelineStageFlags2.AllCommands,
            srcMask: VkAccessFlags2.TransferWrite,
            dstMask: VkAccessFlags2.ColorAttachmentWrite | VkAccessFlags2.ShaderWrite | VkAccessFlags2.ColorAttachmentRead | VkAccessFlags2.ShaderRead
            );
    }

    public void End()
    {
        var device = RenderDevice!;

        Check(
            device.VkDeviceApi.vkEndCommandBuffer(Handle),
            "vkEndCommandBuffer");
    }

    public void ImageTransitionBarrier(
        Image image,
        VkImageLayout targetLayout,
        uint mipLevel = 0,
        VkPipelineStageFlags2 srcBeforeTransition = 0,
        VkPipelineStageFlags2 dstTransitionBefore = 0,
        VkAccessFlags2 srcMask = 0,
        VkAccessFlags2 dstMask = 0,

        VkImageAspectFlags aspectFlags = VkImageAspectFlags.Color
        )
    {
        var device = RenderDevice!;


        var barrier = new VkImageMemoryBarrier2
        {
            oldLayout = image.MipLayouts[mipLevel],
            newLayout = targetLayout,
            srcAccessMask = srcMask,
            srcStageMask = srcBeforeTransition,
            dstAccessMask = dstMask,
            dstStageMask = dstTransitionBefore,
            image = image.ImageHandle,
            subresourceRange = new VkImageSubresourceRange
            {
                aspectMask = aspectFlags,
                baseMipLevel = mipLevel,
                levelCount = 1,
                baseArrayLayer = 0,
                layerCount = 1
            }
        };

        PipelineBarrier([barrier]);
        image.MipLayouts[mipLevel] = targetLayout;
    }

    public void PipelineBarrier(ReadOnlySpan<VkImageMemoryBarrier2> imageMemoryBarriers = new ReadOnlySpan<VkImageMemoryBarrier2>(), ReadOnlySpan<VkBufferMemoryBarrier2> bufferMemoryBarriers = new ReadOnlySpan<VkBufferMemoryBarrier2>(), ReadOnlySpan<VkMemoryBarrier2> memoryBarriers = new ReadOnlySpan<VkMemoryBarrier2>())
    {
        fixed (VkImageMemoryBarrier2* pImageMemoryBarriers = imageMemoryBarriers)
        fixed (VkBufferMemoryBarrier2* pBufferMemoryBarriers = bufferMemoryBarriers)
        fixed (VkMemoryBarrier2* pMemoryBarriers = memoryBarriers)
        {
            VkDependencyInfo depInfo = new VkDependencyInfo
            {
                memoryBarrierCount = (uint)memoryBarriers.Length,
                pMemoryBarriers = pMemoryBarriers,
                bufferMemoryBarrierCount = (uint)bufferMemoryBarriers.Length,
                pBufferMemoryBarriers = pBufferMemoryBarriers,
                imageMemoryBarrierCount = (uint)imageMemoryBarriers.Length,
                pImageMemoryBarriers = pImageMemoryBarriers
            };

            RenderDevice!.VkDeviceApi.vkCmdPipelineBarrier2(Handle, &depInfo);
        }
        //H7per: TODO: We should warn if nothing was submitted.
    }

    public void BindGraphicsPipeline(PipelineGraphics pipeline)
    {
        RenderDevice!.VkDeviceApi.vkCmdBindPipeline(Handle, VkPipelineBindPoint.Graphics, pipeline.HandlePipeline);
    }

    public void BindVertexBuffer(Buffer vertexBuffer, uint binding = 0)
    {
        RenderDevice!.VkDeviceApi.vkCmdBindVertexBuffer(Handle, binding, vertexBuffer.Handle);
    }

    public void BindIndexBuffer(Buffer indexBuffer)
    {
        RenderDevice!.VkDeviceApi.vkCmdBindIndexBuffer(Handle, indexBuffer.Handle, 0, VkIndexType.Uint32);
    }

    //Might need an overload to set multiple.
    public void SetViewport(VkViewport viewport)
    {
        RenderDevice!.VkDeviceApi.vkCmdSetViewport(Handle, 0, viewport);
    }

    public void SetScissor(VkRect2D scissor)
    {
        RenderDevice!.VkDeviceApi.vkCmdSetScissor(Handle, 0, scissor);
    }

    public void PushConstants<T>(T data, uint offset = 0) where T : struct
    {
        if (offset + sizeof(T) > 8)
        {
            throw new ArgumentException($"The size of {nameof(T)} exceeds the available push constant range");
        }
        RenderDevice!.VkDeviceApi.vkCmdPushConstants(Handle, RenderDevice!.SharedPipelineLayout, VkShaderStageFlags.All, offset, (uint)sizeof(T), &data);
    }




    public void BeginRendering(RenderingInfo renderingInfo)
    {
        VkRenderingInfo VkRenderingInfo = new();

        if (renderingInfo.renderArea.extent.width == 0 || renderingInfo.renderArea.extent.height == 0)
        {
            VkRenderingInfo.renderArea = new VkRect2D
            {
                offset = new(),
                extent = new VkExtent2D { width = renderingInfo.colorAttachments[0].image!.Width, height = renderingInfo.colorAttachments[0].image!.Height }
            };
        }
        else
        {
            VkRenderingInfo.renderArea = renderingInfo.renderArea;
        }

        VkRenderingInfo.layerCount = renderingInfo.layerCount;
        VkRenderingInfo.colorAttachmentCount = (uint)renderingInfo.colorAttachments.Length;

        VkRenderingAttachmentInfo[] colorAttachmentArray = new VkRenderingAttachmentInfo[renderingInfo.colorAttachments.Length];

        for (uint i = 0; i < colorAttachmentArray.Length; i++)
        {
            colorAttachmentArray[i].sType = VkStructureType.RenderingAttachmentInfo;
            colorAttachmentArray[i].imageView = renderingInfo.colorAttachments[i].image.ImageViewHandle;
            colorAttachmentArray[i].imageLayout = renderingInfo.colorAttachments[i].image.MipLayouts[0];
            colorAttachmentArray[i].loadOp = renderingInfo.colorAttachments[i].loadOp;
            colorAttachmentArray[i].storeOp = renderingInfo.colorAttachments[i].storeOp;
            colorAttachmentArray[i].clearValue = renderingInfo.colorAttachments[i].clearValue;

            if (renderingInfo.colorAttachments[i].resolveImage != null)
            {
                colorAttachmentArray[i].resolveMode = renderingInfo.colorAttachments[i].resolveMode;
                colorAttachmentArray[i].resolveImageView = renderingInfo.colorAttachments[i].resolveImage!.ImageViewHandle;
                colorAttachmentArray[i].resolveImageLayout = renderingInfo.colorAttachments[i].resolveImage!.MipLayouts[0];
            }

        }

        VkRenderingAttachmentInfo* pDepthAttachment = null;

        VkRenderingAttachmentInfo depthAttachment;
        if (renderingInfo.depthAttachment.HasValue)
        {
            depthAttachment = new()
            {
                imageView = renderingInfo.depthAttachment.Value.image.ImageViewHandle,
                imageLayout = renderingInfo.depthAttachment.Value.image.MipLayouts[0],
                loadOp = renderingInfo.depthAttachment.Value.loadOp,
                storeOp = renderingInfo.depthAttachment.Value.storeOp,
                clearValue = renderingInfo.depthAttachment.Value.clearValue,

            };

            if (renderingInfo.depthAttachment.Value.resolveImage != null)
            {
                depthAttachment.resolveMode =               renderingInfo.depthAttachment.Value.resolveMode;
                depthAttachment.resolveImageView =          renderingInfo.depthAttachment.Value.resolveImage!.ImageViewHandle;
                depthAttachment.resolveImageLayout =        renderingInfo.depthAttachment.Value.resolveImage!.MipLayouts[0];
            }

            pDepthAttachment = &depthAttachment;
        }


        VkRenderingInfo.pDepthAttachment = pDepthAttachment;

        fixed (VkRenderingAttachmentInfo* pAttachmentInfos = colorAttachmentArray)
        {
            VkRenderingInfo.pColorAttachments = pAttachmentInfos;
            BeginRendering(VkRenderingInfo);
        }

    }

    public void BeginRendering(VkRenderingInfo renderingInfo)
    {
        RenderDevice!.VkDeviceApi.vkCmdBeginRendering(Handle, &renderingInfo);
    }

    public void EndRendering()
    {
        RenderDevice!.VkDeviceApi.vkCmdEndRendering(Handle);
    }

    public void Draw(uint vertexCount, uint instanceCount, uint firstVertex, uint firstInstance)
    {
        RenderDevice!.VkDeviceApi.vkCmdDraw(Handle, vertexCount, instanceCount, firstVertex, firstInstance);
    }

    public void DrawIndexed(uint indexCount, uint instanceCount, uint firstIndex, int vertexOffset, uint firstInstance)
    {
        RenderDevice!.VkDeviceApi.vkCmdDrawIndexed(Handle, indexCount, instanceCount, firstIndex, vertexOffset, firstInstance);
    }

    private static void Check(
        VkResult result,
        string operation)
    {
        if (result != VkResult.Success)
            throw new Exception(
                $"{operation} failed: {result}");
    }

    public void Dispose()
    {
        var device = RenderDevice;

        if (device == null)
            return;

        device.VkDeviceApi.vkDestroyCommandPool(
            _commandPool,
            null);
    }
}
