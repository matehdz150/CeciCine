import WatchClient from "./WatchClient";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const id = params.id;

  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?api_key=TU_API_KEY`
  );

  const movie = await res.json();

  const image = `https://image.tmdb.org/t/p/original${movie.backdrop_path}`;

  return {
    title: movie.title,
    description: movie.overview,
    openGraph: {
      title: movie.title,
      description: movie.overview,
      images: [image],
    },
  };
}

export default function Page({
  params,
}: {
  params: { id: string };
}) {
  return <WatchClient id={params.id} />;
}