/*
 * Public commerce profile — this file intentionally contains no credentials.
 * Complete it only after Panopie has a registered legal entity, a real
 * customer-support inbox, and a business address that can be disclosed to
 * customers. Keep payment and payout provider secret/webhook keys on the
 * server, never here.
 */
window.PANOPIE_LEGAL_PROFILE = {
  launchState: 'private_pilot',
  operatorLegalName: '',
  operatorBusinessAddress: '',
  customerSupportEmail: '',
  privacyContactEmail: '',
  effectiveDate: '',
  paymentProvider: 'Payment and payout providers pending approval',
  paymentEnabled: false,
  // Set only after a licensed lawyer's written review; the pilot status page reports it.
  legalReviewApproved: false,
  legalReviewApprovedAt: '',
  legalReviewFrozenVersion: '',
  // Set only on the owner's word to open buying (REQUEST_LOG 158). It opens checkout together with the
  // operator details and paymentEnabled, and never makes the site say that a lawyer reviewed anything.
  launchApproved: false,
  launchApprovedAt: '',
  launchFrozenVersion: '',
  settlementAddendumVersion: 'PAN-SETTLEMENT-DRAFT-1.3',
  // Set to true on the day merchant terms 2.4 are published (REQUEST_LOG 171): only then does the recruiting page show
  // the fee table of version 2.4 instead of the current text. Nothing else changes with it.
  terms24Published: false,
  // The line that names Panopie's registered US copyright agent (17 U.S.C. 512(c)(2)). Fill it in only after the agent is
  // registered with the US Copyright Office; until then the US copyright part of the rights page is not shown (REQUEST_LOG 171).
  usCopyrightAgent: '',
  // This is deliberately separate from the public-checkout legal profile.
  // It identifies the sender of merchant-pilot emails only; it does not
  // make checkout, payment collection, or public commerce available. Every visitor downloads this file, so the
  // owner's own name and home address are not kept here; the emails carry them (REQUEST_LOG 146, legal check).
  merchantOutreach: {
    tradingName: 'Panopie (formerly THREADLINE)'
  }
};
