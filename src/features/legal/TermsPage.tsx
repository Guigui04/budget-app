import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'

/** Conditions d'utilisation — page publique (exigée par l'AISP en production). */
export function TermsPage() {
  return (
    <div className="legal">
      <div className="legal-inner">
        <Link to="/login" className="legal-back">← Retour</Link>
        <span className="legal-mark" aria-hidden="true"><FileText size={26} /></span>
        <h1>Conditions d'utilisation</h1>
        <p className="legal-meta">Application « Foyer » · usage strictement privé · dernière mise à jour : juin 2026</p>

        <h2>1. Objet</h2>
        <p>
          « Foyer » est une application privée d'agrégation budgétaire à usage personnel, destinée aux
          membres d'un même foyer. Elle présente, en <strong>lecture seule</strong>, les comptes et
          opérations bancaires afin d'en faciliter le suivi.
        </p>

        <h2>2. Service d'information sur les comptes</h2>
        <p>
          L'accès aux données bancaires est assuré par <strong>Enable Banking</strong>, prestataire de
          services d'information sur les comptes agréé (DSP2). L'application n'effectue
          <strong> aucune opération de paiement</strong> et ne stocke aucun identifiant bancaire : la
          connexion se fait par authentification forte (SCA) auprès de votre banque.
        </p>

        <h2>3. Usage</h2>
        <ul>
          <li>L'accès est réservé aux membres du foyer disposant d'un compte.</li>
          <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
          <li>L'application ne fournit aucun conseil financier, fiscal ou d'investissement.</li>
        </ul>

        <h2>4. Disponibilité</h2>
        <p>
          Le service est fourni « en l'état », sans garantie de disponibilité continue. Les données
          affichées dépendent de la disponibilité des interfaces bancaires et de l'agrégateur.
        </p>

        <h2>5. Données personnelles</h2>
        <p>
          Le traitement des données est décrit dans la{' '}
          <Link to="/confidentialite">politique de confidentialité</Link>. Vous pouvez retirer votre
          consentement et supprimer vos connexions bancaires à tout moment.
        </p>

        <h2>6. Droit applicable</h2>
        <p>
          Les présentes conditions sont régies par le droit français. Contact :{' '}
          <a href="mailto:guillaumegiraud04@gmail.com">guillaumegiraud04@gmail.com</a>.
        </p>
      </div>
    </div>
  )
}
