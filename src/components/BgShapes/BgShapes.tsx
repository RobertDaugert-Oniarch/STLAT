interface BgShapesProps {
  prefix: string;
  count?: number;
}

const BgShapes = ({ prefix, count = 3 }: BgShapesProps) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className={`${prefix}-bg-shape ${prefix}-bg-shape--${i + 1}`} />
    ))}
  </>
);

export default BgShapes;
