import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

/** Politique de confidentialité — page publique (exigée par l'AISP en production). */
export function PrivacyPage() {
  return (
    <div className="legal">
      <div className="legal-inner">
        <Link to="/login" className="legal-back">← Retour</Link>
        <span className="legal-mark" aria-hidden="true"><ShieldCheck size={26} /></span>
        <h1>Politique de confidentialité</h1>
        <p className="legal-meta">Application « Foyer » · usage strictement privé · dernière mise à jour : juin 2026</p>

        <h2>1. Responsable du traitement</h2>
        <p>
          « Foyer » est une application privée de gestion de budget, utilisée par les membres d'un
          même foyer. Contact : <a href="mailto:guillaumegiraud04@gmail.com">guillaumegiraud04@gmail.com</a>.
        </p>

        <h2>2. Données traitées</h2>
        <ul>
          <li>Identifiants de compte : adresse e-mail et nom d'affichage.</li>
          <li>
            Données bancaires en <strong>lecture seule</strong>, obtenues via l'agrégateur agréé
            <strong> Enable Banking</strong> (prestataire de services d'information sur les comptes,
            DSP2) : soldes, opérations, libellés, IBAN (affiché masqué).
          </li>
          <li>Données saisies dans l'app : budgets, objectifs d'épargne, catégories.</li>
        </ul>

        <h2>3. Finalité &amp; base légale</h2>
        <p>
          Les données servent uniquement à présenter votre budget au sein du foyer. Le traitement
          repose sur votre <strong>consentement explicite</strong>, recueilli avant toute connexion
          bancaire et renouvelable. Aucune initiation de paiement n'est effectuée (service
          d'information uniquement, AIS).
        </p>

        <h2>4. Hébergement &amp; sécurité</h2>
        <ul>
          <li>Données hébergées dans l'Union européenne (Supabase) ; application servie par Vercel.</li>
          <li>Cloisonnement strict par foyer (Row Level Security) et chiffrement en transit (HTTPS).</li>
          <li>
            Les secrets serveur (clés d'agrégation, tokens bancaires) ne quittent jamais le serveur
            et ne sont jamais exposés à l'application.
          </li>
        </ul>

        <h2>5. Conservation &amp; suppression</h2>
        <p>
          Le consentement bancaire est valable ~90 jours puis renouvelable. Vous pouvez à tout moment
          <strong> supprimer une connexion bancaire</strong> depuis l'app : les comptes et opérations
          associés sont alors supprimés. La suppression de votre compte efface vos données.
        </p>

        <h2>6. Partage</h2>
        <p>
          Aucune donnée n'est vendue ni partagée à des tiers à des fins commerciales. Les seuls
          sous-traitants techniques sont l'agrégateur bancaire (Enable Banking) et les hébergeurs
          (Supabase, Vercel), strictement pour le fonctionnement du service.
        </p>

        <h2>7. Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et de
          retrait du consentement. Exercice à l'adresse de contact ci-dessus.
        </p>
      </div>
    </div>
  )
}
