using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text;
using ValveResourceFormat.Renderer2.RHI;

namespace ValveResourceFormat.Renderer2;

record ResourceDestroyRequest
{
    public required IResource Resource { get; init; }
    public required ulong DestroyAfterFrame { get; init; }
}

internal class DestroyQueue
{
    ConcurrentQueue<ResourceDestroyRequest> Requests = new();

    public void Enqueue(IResource resource, ulong retiredFrame)
        => Requests.Enqueue(new ResourceDestroyRequest
        {
            Resource = resource,
            DestroyAfterFrame = retiredFrame
        });

    public void ProcessDestroys(ulong safeFrame)
    {
        while (Requests.TryPeek(out var pending) && pending.DestroyAfterFrame <= safeFrame)
        {
            Requests.TryDequeue(out _);
            pending.Resource.Destroy();
        }
    }
}
