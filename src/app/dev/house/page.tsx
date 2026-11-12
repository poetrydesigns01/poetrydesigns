import { notFound } from "next/navigation";
import { HouseGallery } from "./gallery";

// A gallery for checking the drawings and the shared pieces while building. It exists only
// in development: a production build answers 404 here.
export default function DevHouse() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <HouseGallery />;
}
