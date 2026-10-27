import { LEGAL_ENTITY, legalMailto } from '../config/legal'
import LegalContactBlock from '../components/legal/LegalContactBlock'
import LegalList from '../components/legal/LegalList'
import LegalPage from '../components/legal/LegalPage'
import LegalParagraph from '../components/legal/LegalParagraph'
import LegalPlanCatalog from '../components/legal/LegalPlanCatalog'
import LegalSection from '../components/legal/LegalSection'

export default function CgvPage() {
  return (
    <LegalPage
      intro={`Les présentes Conditions Générales de Vente (CGV) s'appliquent aux abonnements souscrits par les auto-écoles auprès de ${LEGAL_ENTITY.companyName} pour l'utilisation de ${LEGAL_ENTITY.tradeName}.`}
      seoKey="cgv"
      title="Conditions générales de vente"
    >
      <LegalSection id="objet" title="Objet">
        <LegalParagraph>
          Les CGV définissent les conditions financières et contractuelles de souscription aux offres
          Pedagogia Drive (essai, Starter, Premium).
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="abonnements" title="Abonnements">
        <LegalParagraph>
          Les abonnements sont conclus pour la durée indiquée lors de la souscription. Le détail des
          offres disponibles est présenté ci-dessous et synchronisé avec le catalogue de
          l&apos;application :
        </LegalParagraph>
        <LegalPlanCatalog />
      </LegalSection>

      <LegalSection id="essai" title="Essai gratuit">
        <LegalParagraph>
          L&apos;offre d&apos;essai permet de tester la plateforme pendant la durée indiquée dans le catalogue,
          sans engagement de paiement tant que l&apos;essai est actif. À l&apos;issue de l&apos;essai, l&apos;auto-école
          peut souscrire un abonnement payant ou demander la clôture de son espace.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="starter" title="Starter">
        <LegalParagraph>
          L&apos;abonnement Starter s&apos;adresse aux auto-écoles souhaitant digitaliser leur gestion avec un
          volume d&apos;élèves adapté. Il comprend toutes les fonctionnalités et jusqu&apos;à 50 élèves inscrits par
          année d&apos;abonnement.
        </LegalParagraph>
        <LegalParagraph>
          L&apos;année d&apos;abonnement commence à la fin de l&apos;essai gratuit, à la date de début de l&apos;abonnement
          payant. Elle court sur 12 mois puis se renouvelle à chaque date anniversaire ; le compteur d&apos;élèves repart
          alors à zéro. Sont comptés les élèves inscrits dans Pedagogia Drive pendant cette période. Pendant l&apos;essai
          gratuit, la même limite de 50 élèves s&apos;applique à la période d&apos;essai. À 40 élèves, l&apos;auto-école est
          prévenue par e-mail. À 50 élèves, l&apos;inscription de nouveaux élèves est suspendue jusqu&apos;à la fin de la
          période en cours, sauf passage à l&apos;abonnement Premium, sur simple demande auprès de Pedagogia Drive.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="premium" title="Premium">
        <LegalParagraph>
          L&apos;abonnement Premium offre un nombre d&apos;élèves illimité et un accompagnement renforcé. Les
          caractéristiques exactes sont celles publiées dans le catalogue au moment de la souscription.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="paiement" title="Paiement">
        <LegalParagraph>
          Les paiements s&apos;effectuent par les moyens proposés lors de la souscription (carte bancaire,
          prélèvement ou virement selon les modalités communiquées). Les prix sont exprimés en euros
          hors taxes, sauf mention contraire.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="facturation" title="Facturation">
        <LegalParagraph>
          Une facture est émise pour chaque période de facturation. L&apos;auto-école s&apos;engage à fournir
          des informations de facturation exactes (raison sociale, SIRET, adresse).
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="renouvellement" title="Renouvellement">
        <LegalParagraph>
          Sauf résiliation dans les délais, l&apos;abonnement est renouvelé tacitement pour des périodes
          successives de même durée, aux tarifs en vigueur au moment du renouvellement, sous réserve
          d&apos;information préalable en cas de modification tarifaire.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="resiliation" title="Résiliation">
        <LegalParagraph>
          L&apos;auto-école peut résilier son abonnement selon les modalités prévues dans son espace client
          ou par e-mail à{' '}
          <a className="font-semibold text-cyan-700 hover:text-cyan-800" href={legalMailto()}>
            {LEGAL_ENTITY.email}
          </a>
          . La résiliation prend effet à la fin de la période en cours, sauf disposition contraire.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="remboursement" title="Remboursement">
        <LegalParagraph>
          Sauf obligation légale ou dysfonctionnement imputable à l&apos;éditeur, les périodes entamées ne
          donnent pas lieu à remboursement au prorata. Une période d&apos;essai gratuite ne génère aucun
          paiement.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="responsabilite-cgv" title="Responsabilité">
        <LegalList
          items={[
            `${LEGAL_ENTITY.companyName} est soumis à une obligation de moyens dans la fourniture du service.`,
            'La responsabilité de l\'éditeur est limitée au montant des sommes versées par l\'auto-école sur les douze derniers mois, sauf faute lourde ou dol.',
            'L\'auto-école demeure responsable de l\'usage pédagogique de la plateforme et des relations avec ses élèves.',
          ]}
        />
      </LegalSection>

      <LegalSection id="droit-applicable-cgv" title="Droit applicable">
        <LegalParagraph>
          Les CGV sont soumises au droit français. En cas de litige, une solution amiable sera recherchée
          avant toute action judiciaire.
        </LegalParagraph>
        <LegalContactBlock label="Service commercial et facturation" />
      </LegalSection>
    </LegalPage>
  )
}
