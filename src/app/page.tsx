// Page provisoire de la Phase 1. Elle n'affiche aucun contenu métier : celui-ci
// vient du Content Layer en Phase 2, et la page d'accueil réelle est P4-03.
// Ce qu'elle doit prouver dès maintenant : HTML sémantique, `h1` unique, `main`
// identifiable, et rendu côté serveur sans le moindre JavaScript.
export default function HomePage() {
  return (
    <main id="main">
      <h1>Portfolio</h1>
      <p>
        Fondation technique — Phase 1. Le contenu, la navigation et la scène 3D arrivent aux phases
        suivantes.
      </p>
    </main>
  )
}
