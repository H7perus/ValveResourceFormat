namespace ValveResourceFormat.CompiledShader;

// ChannelBlocks are always 280 bytes long
public class ChannelBlock : ShaderDataBlock
{
    public int BlockIndex { get; }

    public ChannelMapping Channel { get; }
    public int[] InputTextureIndices { get; } = new int[4];
    public int ColorMode { get; }
    public string TexProcessorName { get; }

    public ChannelBlock(ShaderDataReader datareader, int blockIndex) : base(datareader)
    {
        BlockIndex = blockIndex;
        Channel = (ChannelMapping)datareader.ReadUInt32();
        InputTextureIndices[0] = datareader.ReadInt32();
        InputTextureIndices[1] = datareader.ReadInt32();
        InputTextureIndices[2] = datareader.ReadInt32();
        InputTextureIndices[3] = datareader.ReadInt32();
        ColorMode = datareader.ReadInt32();
        TexProcessorName = datareader.ReadNullTermStringAtPosition();
        datareader.BaseStream.Position += 256;
    }

    public void PrintByteDetail()
    {
        DataReader.BaseStream.Position = Start;
        DataReader.ShowByteCount($"CHANNEL-BLOCK[{BlockIndex}]");
        DataReader.ShowBytes(24, 4);
        var name1 = DataReader.ReadNullTermStringAtPosition();
        DataReader.Comment($"{name1}");
        DataReader.ShowBytes(256);
        DataReader.BreakLine();
    }
}
