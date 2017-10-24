// @flow
import mirror from 'keymirror-flow';

export const types = mirror({
  createOffer: 1,
  acceptOffer: 1,
  acceptOfferIntern: 1,
  rejectOffer: 1,
  createApplication: 1,
  internAwaitingApproval: 1,
  internCompleted: 1,
  internFired: 1,
});
