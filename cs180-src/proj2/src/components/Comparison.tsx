import { ReactCompareSlider } from "react-compare-slider";

export function Comparison({
  itemOne,
  itemTwo,
  changePositionOnHover = false,
}: {
  itemOne: React.ReactNode;
  itemTwo: React.ReactNode;
  changePositionOnHover?: boolean;
}) {
  return (
    <ReactCompareSlider
      className="not-prose w-full rounded-lg"
      itemOne={itemOne}
      itemTwo={itemTwo}
      changePositionOnHover={changePositionOnHover}
    />
  );
}
