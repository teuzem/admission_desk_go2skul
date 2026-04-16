import BaseErrorPage from './BaseErrorPage'

export default function MaintenancePage() {
  return (
    <BaseErrorPage
      code="503"
      title="Service Unavailable"
      description="Admission Desk is currently undergoing scheduled maintenance. We'll be back online shortly. Thank you for your patience!"
      type="503"
    />
  )
}
