import { useEffect, useState } from 'react'
import { fetchReviews, saveReview } from '../api/index.js'
import { useToast } from '../hooks/useToast.js'

export default function Reviews({ placeId, account }) {
  const toast = useToast()
  const [data, setData] = useState({ summary: { count: 0, average: 0 }, reviews: [] })
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchReviews(placeId, controller.signal).then(setData).catch(() => {})
    return () => controller.abort()
  }, [placeId])

  const submit = async (event) => {
    event.preventDefault()
    if (!account) return toast('Войдите в профиль, чтобы оставить отзыв')
    setBusy(true)
    try {
      setData(await saveReview(placeId, rating, text))
      setText('')
      toast('Отзыв сохранён')
    } catch (error) { toast(error.message) } finally { setBusy(false) }
  }

  return (
    <div className="reviews-box">
      <div className="reviews-summary">★ {data.summary.average || '—'} <small>({data.summary.count} отзывов)</small></div>
      <form className="review-form" onSubmit={submit}>
        <select value={rating} onChange={(event) => setRating(Number(event.target.value))} aria-label="Оценка">
          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{'★'.repeat(value)} — {value}</option>)}
        </select>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder={account ? 'Ваш отзыв о месте' : 'Войдите, чтобы написать'} maxLength={500} disabled={!account || busy} />
        <button type="submit" disabled={busy}>{busy ? '…' : 'Оценить'}</button>
      </form>
      {data.reviews.slice(0, 2).map((review) => <p className="review-line" key={review.id}><b>{review.avatar} {review.name || 'Путешественник'}</b> · {'★'.repeat(review.rating)}<br />{review.text}</p>)}
    </div>
  )
}
