'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchResults } from './components/SearchResults'
import { Search, Users, Calendar, MapPin, ArrowRightLeft, Loader2 } from 'lucide-react'

// --- AutocompleteInput Component ---
interface AutocompleteInputProps {
  type: "origin" | "destination";
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ type, label, value, onChange }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length === 0) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/search/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, type }),
      });

      if (!response.ok) throw new Error("Failed to fetch suggestions");
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (value.length > 0) {
      const handler = setTimeout(() => fetchSuggestions(value), 300);
      return () => clearTimeout(handler);
    } else {
      setSuggestions([]);
    }
  }, [value, fetchSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (e.target.value.length > 0) setIsOpen(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {label}
      </label>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={type === "origin" ? "e.g., Paris" : "e.g., Berlin"}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-12 pr-10"
        />
        
        {isLoading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {isOpen && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onMouseDown={() => handleSuggestionClick(suggestion)}
                className="px-4 py-2 text-sm cursor-pointer hover:bg-accent transition-colors"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<{accommodation?: any, transport?: any} | null>(null)

  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [departure, setDeparture] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [guests, setGuests] = useState(2)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      const [accRes, transRes] = await Promise.all([
        fetch('/api/search/accommodation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination, checkIn, checkOut, guests }),
        }),
        fetch('/api/search/transport', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin, destination, departure, return: returnDate, passengers: guests }),
        })
      ])

      const accData = accRes.ok ? await accRes.json() : null
      const transData = transRes.ok ? await transRes.json() : null

      if (accData?.error) throw new Error(accData.error)
      if (transData?.error) throw new Error(transData.error)

      setResults({ accommodation: accData?.data || [], transport: transData?.data || { flights: [], trains: [] } })
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Travel Planner</h1>
          <p className="text-primary-foreground/80">Find the best accommodations and transport for your next trip</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSearch} className="bg-card rounded-xl shadow-lg p-6">
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <AutocompleteInput type="origin" label="From (Origin)" value={origin} onChange={setOrigin} />
              <AutocompleteInput type="destination" label="To (Destination)" value={destination} onChange={setDestination} />
            </div>

            <div className="grid gap-4 md:grid-cols-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Check-in
                </label>
                <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required min={new Date().toISOString().split('T')[0]} className="h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Check-out
                </label>
                <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required min={checkIn || new Date().toISOString().split('T')[0]} className="h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Departure
                </label>
                <Input type="date" value={departure} onChange={(e) => setDeparture(e.target.value)} required min={new Date().toISOString().split('T')[0]} className="h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Return
                </label>
                <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} min={departure || new Date().toISOString().split('T')[0]} className="h-12" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Guests / Passengers
                </label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" onClick={() => setGuests(Math.max(1, guests - 1))} className="h-12 w-12">-</Button>
                  <Input type="number" value={guests} onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value) || 1))} min={1} max={10} className="h-12 text-center" />
                  <Button type="button" variant="outline" size="icon" onClick={() => setGuests(Math.min(10, guests + 1))} className="h-12 w-12">+</Button>
                </div>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={isLoading} className="w-full h-12" size="lg">
                  <Search className="h-4 w-4 mr-2" />
                  {isLoading ? 'Searching...' : 'Search All'}
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="max-w-6xl mx-auto mt-12">
          <SearchResults results={results} isLoading={isLoading} error={error} searchParams={{ checkIn, checkOut, guests, rooms: 1 }} />
        </div>
      </main>
    </div>
  )
}