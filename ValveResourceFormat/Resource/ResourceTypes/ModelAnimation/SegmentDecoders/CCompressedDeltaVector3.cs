using System.Runtime.InteropServices;

namespace ValveResourceFormat.ResourceTypes.ModelAnimation.SegmentDecoders
{
    public class CCompressedDeltaVector3 : AnimationSegmentDecoder
    {
        public override void Read(int frameIndex, Frame outFrame)
        {
            var offset = frameIndex * ElementCount;

            const int BaseElementSize = sizeof(float) * 3; // sizeof(Vector3)
            var baseData = MemoryMarshal.Cast<byte, Vector3>(Data.AsSpan(0, ElementCount * BaseElementSize));
            var deltaData = MemoryMarshal.Cast<byte, Half3>(Data.AsSpan(ElementCount * BaseElementSize));
            //var numFrames = deltaData.Length / ElementCount;

            for (var i = 0; i < RemapTable.Length; i++)
            {
                var elementIndex = WantedElements[i];

                var baseVector = baseData[elementIndex];
                var deltaVector = deltaData[offset + elementIndex];

                outFrame.SetAttribute(
                    RemapTable[i],
                    ChannelAttribute,
                    baseVector + deltaVector
                );
            }
        }
    }
}
