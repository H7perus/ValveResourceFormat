using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Vortice.Vulkan;
//using static S2vDevice;
using static Vortice.Vulkan.Vulkan;

namespace ValveResourceFormat.Renderer2.RHI
{
    public unsafe class Swapchain : IDisposable
    {
        private VkSwapchainKHR _swapchain;

        private uint _currentImageIndex;
        private readonly List<Image> _images = new();
        private readonly List<VkSemaphore> _writeToImageFinishedSemaphores = new();
        public VkSwapchainKHR Handle => _swapchain;

        public IReadOnlyList<Image> Images => _images;
        public IReadOnlyList<VkSemaphore> WriteToImageFinishedSemaphores => _writeToImageFinishedSemaphores;

        public VkPresentModeKHR PresentMode { get; private set; }
        public VkSurfaceKHR Surface { get; private set; }
        public VkSurfaceFormatKHR SurfaceFormat { get; private set; }
        public VkExtent2D Extent { get; private set; }

        /// <summary>
        /// True when the swapchain is out of date and needs recreation (e.g., window resize).
        /// </summary>
        public bool IsOutOfDate { get; private set; }

        public Swapchain(uint width, uint height, VkSurfaceKHR surface)
        {
            Create(width, height, surface);
        }

        private void Create(uint width, uint height, VkSurfaceKHR surface, VkSwapchainKHR oldSwapchain = new VkSwapchainKHR())
        {
            var device = RenderDevice
                ?? throw new InvalidOperationException("S2vDevice has not been initialized.");

            //if it is, we are recreating
            if(surface.Handle != 0)
                Surface = surface;

            device.VkInstanceApi.vkGetPhysicalDeviceSurfaceCapabilitiesKHR(
                device.VkPhysicalDevice,
                Surface,
                out var capabilities);

            device.VkInstanceApi.vkGetPhysicalDeviceSurfaceSupportKHR(
                device.VkPhysicalDevice,
                device.QueueFamilyIndices.GraphicsFamily!.Value,
                Surface,
                out var presentSupport);

            if (!presentSupport)
                throw new Exception("Graphics queue family can not present to this surface.");

            uint formatCount = 0;

            device.VkInstanceApi.vkGetPhysicalDeviceSurfaceFormatsKHR(
                device.VkPhysicalDevice,
                Surface,
                &formatCount,
                null);

            if (formatCount == 0)
                throw new Exception("No Vulkan surface formats are available.");

            var formats = new VkSurfaceFormatKHR[formatCount];

            fixed (VkSurfaceFormatKHR* formatsPtr = formats)
            {
                device.VkInstanceApi.vkGetPhysicalDeviceSurfaceFormatsKHR(
                    device.VkPhysicalDevice,
                    Surface,
                    &formatCount,
                    formatsPtr);
            }

            SurfaceFormat = ChooseSurfaceFormat(formats);

            uint presentModeCount = 0;

            device.VkInstanceApi.vkGetPhysicalDeviceSurfacePresentModesKHR(
                device.VkPhysicalDevice,
                Surface,
                &presentModeCount,
                null);

            if (presentModeCount == 0)
                throw new Exception("No Vulkan present modes are available.");

            var presentModes = new VkPresentModeKHR[presentModeCount];

            fixed (VkPresentModeKHR* presentModesPtr = presentModes)
            {
                device.VkInstanceApi.vkGetPhysicalDeviceSurfacePresentModesKHR(
                    device.VkPhysicalDevice,
                    Surface,
                    &presentModeCount,
                    presentModesPtr);
            }

            var presentMode = ChoosePresentMode(presentModes);

            Extent = ChooseExtent(capabilities, width / 2, height / 2);

            uint imageCount = capabilities.minImageCount + 1;

            if (capabilities.maxImageCount != 0 &&
                imageCount > capabilities.maxImageCount)
            {
                imageCount = capabilities.maxImageCount;
            }

            var createInfo = new VkSwapchainCreateInfoKHR
            {
                surface = Surface,
                minImageCount = imageCount,
                imageFormat = SurfaceFormat.format,
                imageColorSpace = SurfaceFormat.colorSpace,
                imageExtent = Extent,
                imageArrayLayers = 1,
                imageUsage = VkImageUsageFlags.ColorAttachment | VkImageUsageFlags.TransferDst,
                imageSharingMode = VkSharingMode.Exclusive,
                preTransform = capabilities.currentTransform,
                compositeAlpha = VkCompositeAlphaFlagsKHR.Opaque,
                presentMode = presentMode,
                clipped = true,
                oldSwapchain = _swapchain.Handle != 0 ? _swapchain : default
            };

            Check(
                device.VkDeviceApi.vkCreateSwapchainKHR(
                    &createInfo,
                    null,
                    out _swapchain),
                "Failed to create swapchain.");

            var images = GetImages();
            var imageViews = CreateImageViews(images);

            for (int i = 0; i < imageCount; i++)
            {
                _images.Add(new Image(images[i], imageViews[i], width, height, SurfaceFormat.format));
            }
        }

        private VkImage[] GetImages()
        {
            var device = RenderDevice!;

            uint imageCount = 0;

            Check(
                device.VkDeviceApi.vkGetSwapchainImagesKHR(
                    _swapchain,
                    &imageCount,
                    null),
                "Failed to query swapchain images.");

            var images = new VkImage[imageCount];

            fixed (VkImage* imagesPtr = images)
            {
                Check(
                    device.VkDeviceApi.vkGetSwapchainImagesKHR(
                        _swapchain,
                        &imageCount,
                        imagesPtr),
                    "Failed to retrieve swapchain images.");
            }

            var semaphores = new VkSemaphore[imageCount];
            foreach (ref var semaphore in semaphores.AsSpan())
            {
                if(semaphore.IsNull)
                    semaphore = RenderDevice!.CreateSemaphore();
            }
            _writeToImageFinishedSemaphores.AddRange(semaphores);

            return images;
        }

        private VkImageView[] CreateImageViews(VkImage[] images)
        {
            VkImageView[] imageViews = new VkImageView[images.Length];

            var device = RenderDevice!;

            for (int i = 0; i < imageViews.Length; i++)
            {
                var createInfo = new VkImageViewCreateInfo
                {
                    image = images[i],
                    viewType = VkImageViewType.Image2D,
                    format = SurfaceFormat.format,
                    components = VkComponentMapping.Rgba,
                    subresourceRange = new VkImageSubresourceRange
                    {
                        aspectMask = VkImageAspectFlags.Color,
                        baseMipLevel = 0,
                        levelCount = 1,
                        baseArrayLayer = 0,
                        layerCount = 1
                    }
                };

                Check(
                    device.VkDeviceApi.vkCreateImageView(
                        &createInfo,
                        null,
                        out var imageView),
                    "Failed to create swapchain image view.");

                imageViews[i] = imageView;
            }
            return imageViews;
        }


        //H7per: TODO: This is a bit hacky. I'd like us to have more control over surface format (HDR?)
        private static VkSurfaceFormatKHR ChooseSurfaceFormat(
            VkSurfaceFormatKHR[] formats)
        {
            foreach (var format in formats)
            {
                if (format.format == VkFormat.B8G8R8A8Unorm &&
                    format.colorSpace == VkColorSpaceKHR.SrgbNonLinear)
                {
                    return format;
                }
            }

            return formats[0];
        }

        //H7per: TODO: Similar to ChooseSurfaceFormat, this lacks control.
        //Fifo is fine for testing for now, but we'd only want that with Vsync on.
        private static VkPresentModeKHR ChoosePresentMode(
            VkPresentModeKHR[] modes)
        {
            foreach (var mode in modes)
            {
                if (mode == VkPresentModeKHR.Mailbox)
                    return mode;
            }

            return VkPresentModeKHR.Fifo;
        }

        private static VkExtent2D ChooseExtent(
            VkSurfaceCapabilitiesKHR capabilities,
            uint width,
            uint height)
        {
            if (capabilities.currentExtent.width != uint.MaxValue)
                return capabilities.currentExtent;

            return new VkExtent2D
            {
                width = Math.Clamp(
                    width,
                    capabilities.minImageExtent.width,
                    capabilities.maxImageExtent.width),

                height = Math.Clamp(
                    height,
                    capabilities.minImageExtent.height,
                    capabilities.maxImageExtent.height)
            };
        }

        public int AcquireNextImage(VkSemaphore imageAvailableSemaphore)
        {
            var device = RenderDevice
                ?? throw new InvalidOperationException(
                    "S2vDevice has not been initialized.");

            IsOutOfDate = false;

            VkResult result = device.VkDeviceApi.vkAcquireNextImageKHR(
                _swapchain,
                ulong.MaxValue,
                imageAvailableSemaphore,
                default,
                out uint imageIndex);

            if (result == VkResult.SuboptimalKHR || result == VkResult.ErrorOutOfDateKHR)
            {
                IsOutOfDate = true;
                return -1;
            }

            Check(result, "Failed to acquire swapchain image.");
            _currentImageIndex = imageIndex;
            return (int)imageIndex;
        }


        public void Present(VkSemaphore renderFinishedSemaphore)
        {
            fixed (VkSwapchainKHR* pSwapchain = &_swapchain)
            fixed (uint* pImageIndex = &_currentImageIndex)
            {
                VkPresentInfoKHR presentInfo = new VkPresentInfoKHR
                {
                    waitSemaphoreCount = 1,
                    pWaitSemaphores = &renderFinishedSemaphore,
                    swapchainCount = 1,
                    pSwapchains = pSwapchain,
                    pImageIndices = pImageIndex
                };

                RenderDevice!.VkDeviceApi.vkQueuePresentKHR(RenderDevice.GraphicsQueue, &presentInfo);
            }
        }

        public void Recreate(uint width, uint height)
        {
            var device = RenderDevice;
            if (device != null)
            {
                // Destroy only image views — swapchain owns the images and will clean them up.
                foreach (var image in _images)
                {
                    device.VkDeviceApi.vkDestroyImageView(image.ImageViewHandle);
                }
                _images.Clear();

                //for (int i = 0; i < _writeToImageFinishedSemaphores.Count; i++)
                //{
                //    VkSemaphore semaphore = _writeToImageFinishedSemaphores[i];
                //    if (semaphore.Handle != 0)
                //    {
                //        device.VkDeviceApi.vkDestroySemaphore(semaphore, null);
                //    }
                //}
                //_writeToImageFinishedSemaphores.Clear();
            }

            Create(width, height, 0, _swapchain);
        }

        public void Dispose()
        {
            var device = RenderDevice;

            if (device == null)
                return;

            foreach (var image in _images)
            {
                device.VkDeviceApi.vkDestroyImageView(image.ImageViewHandle);
            }

            if (_swapchain.Handle != 0)
            {
                device.VkDeviceApi.vkDestroySwapchainKHR(
                    _swapchain,
                    null);

                _swapchain = default;
            }
            _images.Clear();
        }

        //H7per: TODO: This should not be a member function of Swapchain.
        private static void Check(
            VkResult result,
            string message)
        {
            if (result != VkResult.Success)
                throw new Exception(
                    $"{message} Vulkan returned {result}.");
        }
    }
}
