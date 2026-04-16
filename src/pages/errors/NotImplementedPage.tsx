import BaseErrorPage from './BaseErrorPage'

export default function NotImplementedPage() {
  return (
    <BaseErrorPage
      code="501"
      title="Not Implemented"
      description="The feature you're trying to use hasn't been implemented yet. We're working on expanding our services, so stay tuned!"
      type="501"
    />
  )
}
