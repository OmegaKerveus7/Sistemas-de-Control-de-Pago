import './Placeholder.css';

export function Placeholder({ titulo }: { titulo: string }) {
  return (
    <section className="placeholder-page">
      <h1>{titulo}</h1>
      <p>Este módulo está en desarrollo.</p>
    </section>
  );
}

export default Placeholder;
