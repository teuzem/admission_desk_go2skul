import BaseErrorPage from './BaseErrorPage'

export default function ServerErrorPage() {
  return (
    <BaseErrorPage
      code="500"
      title="Server Error"
      description="Something went wrong on our end. We're working to fix it as quickly as possible. Please try again later."
      type="500"
      showSupport
    />
  )
}
