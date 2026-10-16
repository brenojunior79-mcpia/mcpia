'use client'
import { useEffect } from 'react'

// Se a pessoa chegou por um link de indicacao, liga o cadastro a quem indicou (uma unica vez).
export default function ReferralClaim() {
  useEffect(function() {
    try {
      if (document.cookie.indexOf('mcpia_ref=') === -1) return
      fetch('/api/referral/claim', { method: 'POST' }).catch(function() {})
    } catch (e) {}
  }, [])
  return null
}
