import { redirect } from 'next/navigation'

// Root → redirect to the approval queue
export default function Home() {
  redirect('/queue')
}
