'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, Clock, MapPin, Ticket, Plus, Trash2, Loader2,
  Utensils, Camera, TreePine, Building2, Music, ShoppingBag, Bus
} from 'lucide-react'

interface Activity {
  id: string
  name: string
  category: string
  duration: number
  ticketRequired: boolean
  ticketPrice: number | null
  ticketUrl: string | null
  description: string | null
  address: string | null
}

interface ItineraryDay {
  id: string
  dayNumber: number
  date: string
  notes: string | null
  activities: Activity[]
}

interface Props {
  tripId: string
  startDate: string
  endDate: string
  nights: number
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  restaurant: <Utensils className="h-4 w-4" />,
  museum: <Building2 className="h-4 w-4" />,
  park: <TreePine className="h-4 w-4" />,
  activity: <Camera className="h-4 w-4" />,
  concert: <Music className="h-4 w-4" />,
  shopping: <ShoppingBag className="h-4 w-4" />,
  transport: <Bus className="h-4 w-4" />,
}

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: 'bg-orange-100 text-orange-800',
  museum: 'bg-blue-100 text-blue-800',
  park: 'bg-green-100 text-green-800',
  activity: 'bg-purple-100 text-purple-800',
  concert: 'bg-pink-100 text-pink-800',
  shopping: 'bg-yellow-100 text-yellow-800',
  transport: 'bg-gray-100 text-gray-800',
}

export default function ItineraryPlanner({ tripId, startDate, endDate, nights }: Props) {
  const [days, setDays] = useState<ItineraryDay[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState(0)
  const [addingActivity, setAddingActivity] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [activityName, setActivityName] = useState('')
  const [activityCategory, setActivityCategory] = useState('activity')
  const [activityDuration, setActivityDuration] = useState('60')
  const [activityPrice, setActivityPrice] = useState('')
  const [activityUrl, setActivityUrl] = useState('')
  const [activityDesc, setActivityDesc] = useState('')

  const start = new Date(startDate)
  const end = new Date(endDate)

  // Generate day tabs
  const dayTabs = Array.from({ length: nights + 1 }, (_, i) => {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    return {
      dayNumber: i + 1,
      date: date.toISOString().split('T')[0],
      label: `Jour ${i + 1}`,
      dateLabel: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
    }
  })

  useEffect(() => {
    fetch(`/api/trips/${tripId}/itinerary`)
      .then(r => r.json())
      .then(data => {
        setDays(data.days || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [tripId])

  const currentDayData = days.find(d => d.dayNumber === activeDay + 1)

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const dayDate = dayTabs[activeDay].date

    try {
      const res = await fetch(`/api/trips/${tripId}/itinerary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayNumber: activeDay + 1,
          date: dayDate,
          activities: [{
            name: activityName,
            category: activityCategory,
            duration: parseInt(activityDuration) || 60,
            ticketRequired: !!activityPrice,
            ticketPrice: activityPrice ? parseFloat(activityPrice) : null,
            ticketUrl: activityUrl || null,
            description: activityDesc || null,
          }],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setDays(days.map(d => d.dayNumber === activeDay + 1 ? data.day : d).concat(
          days.find(d => d.dayNumber === activeDay + 1) ? [] : [data.day]
        ))
        // Reset form
        setActivityName('')
        setActivityCategory('activity')
        setActivityDuration('60')
        setActivityPrice('')
        setActivityUrl('')
        setActivityDesc('')
        setAddingActivity(false)
      }
    } catch (err) {
      console.error('Failed to add activity:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const deleteActivity = async (activityId: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/itinerary`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId }),
      })

      if (res.ok) {
        setDays(days.map(d => ({
          ...d,
          activities: d.activities.filter(a => a.id !== activityId)
        })))
      }
    } catch (err) {
      console.error('Failed to delete activity:', err)
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement de l'itinéraire...
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planning jour par jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Day tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dayTabs.map((tab, i) => (
              <Button
                key={i}
                variant={activeDay === i ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setActiveDay(i)
                  setAddingActivity(false)
                }}
                className="flex-col h-auto py-2 px-3"
              >
                <span className="text-xs font-normal">{tab.label}</span>
                <span className="text-xs">{tab.dateLabel}</span>
              </Button>
            ))}
          </div>

          {/* Day content */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {dayTabs[activeDay].label} — {dayTabs[activeDay].dateLabel}
              </h3>
              <Button
                size="sm"
                onClick={() => setAddingActivity(!addingActivity)}
                variant={addingActivity ? 'outline' : 'default'}
              >
                <Plus className="h-4 w-4 mr-1" />
                {addingActivity ? 'Annuler' : 'Ajouter une activité'}
              </Button>
            </div>

            {/* Add activity form */}
            {addingActivity && (
              <form onSubmit={addActivity} className="space-y-3 mb-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Nom de l'activité</label>
                    <Input
                      value={activityName}
                      onChange={e => setActivityName(e.target.value)}
                      placeholder="Ex: Musée du Louvre"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Catégorie</label>
                    <select
                      value={activityCategory}
                      onChange={e => setActivityCategory(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                    >
                      <option value="activity">Activité</option>
                      <option value="museum">Musée</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="park">Parc / Nature</option>
                      <option value="concert">Concert / Spectacle</option>
                      <option value="shopping">Shopping</option>
                      <option value="transport">Transport</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Durée (minutes)</label>
                    <Input
                      type="number"
                      value={activityDuration}
                      onChange={e => setActivityDuration(e.target.value)}
                      min="15"
                      step="15"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Prix du billet (€)</label>
                    <Input
                      type="number"
                      value={activityPrice}
                      onChange={e => setActivityPrice(e.target.value)}
                      placeholder="Facultatif"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Lien billetterie</label>
                    <Input
                      value={activityUrl}
                      onChange={e => setActivityUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      value={activityDesc}
                      onChange={e => setActivityDesc(e.target.value)}
                      placeholder="Notes, adresse, horaires..."
                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={submitting || !activityName}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Ajouter
                </Button>
              </form>
            )}

            {/* Activities list */}
            <div className="space-y-3">
              {currentDayData?.activities && currentDayData.activities.length > 0 ? (
                currentDayData.activities.map((activity) => (
                  <Card key={activity.id} className="border-l-4"
                    style={{ borderLeftColor: getCategoryColor(activity.category) }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {CATEGORY_ICONS[activity.category] || <Camera className="h-4 w-4" />}
                            <span className="font-semibold">{activity.name}</span>
                            <Badge className={CATEGORY_COLORS[activity.category] || 'bg-gray-100'}>
                              {activity.category}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.floor(activity.duration / 60)}h{activity.duration % 60 > 0 ? `${activity.duration % 60}m` : ''}
                            </span>
                            {activity.ticketRequired && activity.ticketPrice && (
                              <span className="flex items-center gap-1">
                                <Ticket className="h-3 w-3" />
                                {activity.ticketPrice}€
                              </span>
                            )}
                          </div>
                          
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-2">{activity.description}</p>
                          )}
                          
                          {activity.address && (
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {activity.address}
                            </p>
                          )}
                          
                          {activity.ticketUrl && (
                            <a
                              href={activity.ticketUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline mt-2 inline-block"
                            >
                              Réserver →
                            </a>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteActivity(activity.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune activité planifiée pour ce jour.</p>
                  <Button
                    variant="link"
                    onClick={() => setAddingActivity(true)}
                    className="mt-2"
                  >
                    Ajouter une activité
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    restaurant: '#f97316',
    museum: '#3b82f6',
    park: '#22c55e',
    activity: '#a855f7',
    concert: '#ec4899',
    shopping: '#eab308',
    transport: '#6b7280',
  }
  return colors[category] || '#6b7280'
}
