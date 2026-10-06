using System.Buffers.Binary;
using System.IO.Hashing;
using System.Runtime.InteropServices;

namespace ValveResourceFormat.Renderer.RHI
{
    /// <summary>Per-member options declared through shader attributes.</summary>
    [Flags]
    public enum ParameterFlags : byte
    {
        /// <summary>No options.</summary>
        None = 0,

        /// <summary>
        /// Declared with <c>[SrgbRead]</c>. Float vectors have their rgb converted from gamma to linear when
        /// written, texture handles are bound through an sRGB view.
        /// </summary>
        SrgbRead = 1 << 0,
    }

    /// <summary>A single member of a shader's material parameter block.</summary>
    /// <remarks>
    /// A member is either a value, described by <paramref name="ElementType"/>, <paramref name="Rows"/> and
    /// <paramref name="Columns"/>, or a bindless texture handle, described by <paramref name="TextureDimension"/>.
    /// </remarks>
    /// <param name="Name">The member name as declared in the shader.</param>
    /// <param name="ElementType">The component type of a value, <see cref="ElementType.None"/> for texture handles.</param>
    /// <param name="Rows">The number of rows, 1 for scalars, vectors and texture handles.</param>
    /// <param name="Columns">The number of components per row, 1 for scalars and texture handles.</param>
    /// <param name="Offset">The byte offset of this member within the block.</param>
    /// <param name="Size">The size of this member in bytes, including any row padding.</param>
    /// <param name="TextureDimension">The texture shape of a handle, <see cref="TextureDimension.None"/> for values.</param>
    /// <param name="Flags">Options declared through shader attributes.</param>
    public readonly record struct ParameterMember(
        string Name,
        ElementType ElementType,
        byte Rows,
        byte Columns,
        uint Offset,
        uint Size,
        TextureDimension TextureDimension = TextureDimension.None,
        ParameterFlags Flags = ParameterFlags.None)
    {
        /// <summary>Gets a value indicating whether this member is a bindless texture handle.</summary>
        public bool IsTexture => TextureDimension != TextureDimension.None;

        /// <summary>Gets a value indicating whether this member is a matrix.</summary>
        public bool IsMatrix => Rows > 1;

        /// <summary>Gets a value indicating whether this member is declared with <c>[SrgbRead]</c>.</summary>
        public bool IsSrgbRead => (Flags & ParameterFlags.SrgbRead) != 0;
    }

    /// <summary>
    /// The layout of a shader's material parameter block as reflected from the compiled shader, together with
    /// the block contents every material starts from.
    /// </summary>
    public sealed class ParameterLayout
    {
        private readonly Dictionary<string, ParameterMember> members;
        private readonly byte[] defaultBytes;

        /// <summary>Gets the members by name.</summary>
        public IReadOnlyDictionary<string, ParameterMember> Members => members;

        /// <summary>Gets the size of the block in bytes.</summary>
        public uint Size { get; }

        /// <summary>
        /// Gets the block contents with every member set to its shader default, in the exact form the GPU reads,
        /// with <see cref="ParameterFlags.SrgbRead"/> defaults already converted to linear.
        /// </summary>
        public ReadOnlySpan<byte> DefaultBytes => defaultBytes;

        /// <summary>
        /// Gets a hash over everything that affects the block contents: members, size and defaults. Layouts
        /// with different hashes need differently filled buffers.
        /// </summary>
        public ulong Hash { get; }

        /// <summary>Initializes a new instance of the <see cref="ParameterLayout"/> class.</summary>
        /// <param name="members">The reflected members.</param>
        /// <param name="size">The size of the block in bytes.</param>
        /// <param name="defaultBytes">The block contents with every member set to its default, exactly <paramref name="size"/> bytes long.</param>
        /// <exception cref="ArgumentException">A member is malformed, duplicated or out of bounds, or <paramref name="defaultBytes"/> has the wrong length.</exception>
        public ParameterLayout(IEnumerable<ParameterMember> members, uint size, ReadOnlySpan<byte> defaultBytes)
        {
            ArgumentNullException.ThrowIfNull(members);

            if ((uint)defaultBytes.Length != size)
            {
                throw new ArgumentException($"Default bytes are {defaultBytes.Length} bytes long, expected {size}", nameof(defaultBytes));
            }

            Size = size;
            this.defaultBytes = defaultBytes.ToArray();
            this.members = [];

            foreach (var member in members)
            {
                Validate(member, size);

                if (!this.members.TryAdd(member.Name, member))
                {
                    throw new ArgumentException($"Member '{member.Name}' is declared more than once", nameof(members));
                }
            }

            Hash = ComputeHash();
        }

        /// <summary>
        /// Determines whether a buffer filled for <paramref name="other"/> is also valid for this layout.
        /// </summary>
        /// <param name="other">The layout a buffer was filled for, or <see langword="null"/> if it was never filled.</param>
        /// <returns><see langword="true"/> when both layouts produce identical block contents from the same inputs.</returns>
        public bool IsEquivalentTo(ParameterLayout? other)
        {
            if (other is null)
            {
                return false;
            }

            if (ReferenceEquals(this, other))
            {
                return true;
            }

            if (Hash != other.Hash || Size != other.Size || members.Count != other.members.Count)
            {
                return false;
            }

            // Matching hashes are compared in full, a collision would silently draw with the wrong layout
            if (!DefaultBytes.SequenceEqual(other.DefaultBytes))
            {
                return false;
            }

            foreach (var (name, member) in members)
            {
                if (!other.members.TryGetValue(name, out var otherMember) || member != otherMember)
                {
                    return false;
                }
            }

            return true;
        }

        private static void Validate(in ParameterMember member, uint blockSize)
        {
            if (string.IsNullOrEmpty(member.Name))
            {
                throw new ArgumentException("Member has no name", nameof(member));
            }

            if (member.Rows == 0 || member.Columns == 0 || member.Columns > 4)
            {
                throw new ArgumentException($"Member '{member.Name}' has an invalid shape of {member.Rows}x{member.Columns}", nameof(member));
            }

            if (member.IsTexture)
            {
                if (member.ElementType != ElementType.None || member.Rows != 1 || member.Columns != 1)
                {
                    throw new ArgumentException($"Texture handle '{member.Name}' cannot also be described as a value", nameof(member));
                }
            }
            else if (member.ElementType == ElementType.None)
            {
                throw new ArgumentException($"Member '{member.Name}' is neither a value nor a texture handle", nameof(member));
            }

            if ((ulong)member.Offset + member.Size > blockSize)
            {
                throw new ArgumentException($"Member '{member.Name}' spans {member.Offset}..{(ulong)member.Offset + member.Size} of a {blockSize} byte block", nameof(member));
            }

            if (member.IsSrgbRead)
            {
                var isColor = member.ElementType == ElementType.Float && member.Rows == 1 && member.Columns is 3 or 4;

                if (!isColor && !member.IsTexture)
                {
                    throw new ArgumentException($"Member '{member.Name}' is declared [SrgbRead] but is not a float3, float4 or texture handle", nameof(member));
                }
            }
        }

        private ulong ComputeHash()
        {
            var hash = new XxHash3();

            // Sorted so the hash does not depend on the order reflection enumerated the members in
            var sorted = members.Values.ToArray();
            Array.Sort(sorted, static (a, b) =>
            {
                var byOffset = a.Offset.CompareTo(b.Offset);
                return byOffset != 0 ? byOffset : string.CompareOrdinal(a.Name, b.Name);
            });

            Span<byte> scratch = stackalloc byte[17];

            foreach (var member in sorted)
            {
                BinaryPrimitives.WriteInt32LittleEndian(scratch, member.Name.Length);
                BinaryPrimitives.WriteUInt32LittleEndian(scratch[4..], member.Offset);
                BinaryPrimitives.WriteUInt32LittleEndian(scratch[8..], member.Size);
                scratch[12] = (byte)member.ElementType;
                scratch[13] = member.Rows;
                scratch[14] = member.Columns;
                scratch[15] = (byte)member.TextureDimension;
                scratch[16] = (byte)member.Flags;

                hash.Append(scratch);
                hash.Append(MemoryMarshal.AsBytes(member.Name.AsSpan()));
            }

            BinaryPrimitives.WriteUInt32LittleEndian(scratch, Size);
            hash.Append(scratch[..sizeof(uint)]);
            hash.Append(defaultBytes);

            return hash.GetCurrentHashAsUInt64();
        }
    }
}
