# INFO-VERIF RDC

Plateforme front-end de veille technologique consacree a la desinformation et a la verification de l'information en Republique democratique du Congo.

## Technologies

- HTML5
- CSS3 responsive
- JavaScript
- Fetch API
- LocalStorage
- API GDELT DOC 2.0
- API arXiv
- Flux RSS Radio Okapi via rss2json
- API MyMemory pour les traductions automatiques

## Fonctionnalites

### Fonctionnelles

- Navigation responsive entre les sept rubriques
- Menu mobile
- Recherche locale dans l'historique
- Historique LocalStorage avec relance, suppression individuelle et suppression globale
- Actualites GDELT et Radio Okapi lorsque les sources repondent
- Filtres des actualites par source, date et theme
- Recherche scientifique arXiv
- Titres anglais originaux
- Traductions françaises automatiques des titres et résumés disponibles
- Conservation des auteurs, dates et liens arXiv
- Analyse locale preliminaire des indices linguistiques
- Messages de chargement et d'erreur
- Liens vers les sources fiables

### Etat demonstration ou incomplet

- Google Fact Check Tools n'est pas relie a une cle API securisee dans le serveur
- La rubrique « Verifier une information » affiche donc une demonstration et n'annonce aucun verdict reel
- GDELT, Radio Okapi RSS, arXiv et MyMemory dependent de la connexion et des limites publiques de leurs services
- L'analyse IA est uniquement linguistique et ne confirme pas qu'un contenu a ete genere par une IA

## Sources externes

- GDELT DOC 2.0 : https://api.gdeltproject.org/
- arXiv API : https://export.arxiv.org/api/query
- Flux RSS Radio Okapi : https://www.radiookapi.net/rss.xml
- Convertisseur RSS : https://rss2json.com/
- Traduction automatique : https://mymemory.translated.net/
- AFP Factuel : https://factuel.afp.com/fr
- RFI Fact-checking : https://www.rfi.fr/fr/tag/fact-checking/
- Google Fact Check Explorer : https://toolbox.google.com/factcheck/explorer
- Radio Okapi : https://www.radiookapi.net/

## Structure

```text
index.html
css/
  styles.css
js/
  app.js
assets/
README.md
```

## Lancement local

Aucun Node.js ni aucun serveur backend n'est necessaire pour ouvrir cette version.

1. Ouvrir le dossier dans VS Code.
2. Ouvrir `index.html` dans un navigateur.
3. Naviguer avec le menu sans recharger la page.

Certaines API peuvent ne pas fonctionner selon les restrictions du navigateur, la connexion Internet, les quotas ou les reponses HTTP des services externes.

## Verification avant presentation

1. Ouvrir les pages Accueil, Verifier, Actualites, Detection IA, Recherche scientifique, Sources fiables et A propos.
2. Tester le menu sur ordinateur et sur mobile.
3. Ajouter une recherche dans la rubrique Verifier.
4. Tester Relancer, Supprimer et Effacer tout.
5. Effectuer une recherche arXiv comme « deepfake ».
6. Tester une analyse IA avec un texte court et un texte contenant « urgent » ou « prouve ».
7. Tester les filtres Source, Date et Theme des actualites.
8. Verifier les liens externes depuis la rubrique Sources fiables.

## Securite

Les recherches sont conservees localement dans le navigateur avec LocalStorage. Aucun verdict factuel n'est invente.

Google Fact Check Tools necessitera plus tard un serveur intermediaire protege par une variable d'environnement. Aucun Node.js ni aucun serveur n'est inclus dans cette version actuelle.

## Limites

- GDELT peut retourner une erreur 429 ou être indisponible.
- La passerelle RSS peut être limitee ou temporairement indisponible.
- arXiv peut ralentir ou refuser une requete sans avertissement immediat.
- MyMemory peut appliquer une limite de traduction.
- Une traduction automatique doit etre relue avant utilisation journalistique.

## Auteurs

Projet universitaire realise avec HTML5, CSS3 et JavaScript.
