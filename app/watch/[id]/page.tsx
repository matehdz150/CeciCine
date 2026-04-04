import WatchClient from "./WatchClient";


export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;

  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?api_key=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3Zjk5N2VmNWEzMDE5YTk0YzZmOGM5MDBhNzE0YzQ3ZSIsIm5iZiI6MTc3NTIwMzQ2Ni40NTksInN1YiI6IjY5Y2Y3NDhhMjFlYzhlZDRmNDJmNzRhNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.7lQHC9AKPP32GEqQpbq1xd5WdXhnYC5Z34lHPOY1hPE`
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

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params; // 🔥 obligatorio

  return <WatchClient id={id} />;
}