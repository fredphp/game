'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGameStore, getRarityColor, getRarityLabel, getRarityBg, getElementIcon, formatNumber } from '@/stores/game-store'
import { Search, Filter, Star, Zap, Grid3X3, List } from 'lucide-react'

export default function HeroesPanel() {
  const { heroCollection, setView } = useGameStore()
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<3 | 4 | 5 | 0>(0)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedHero, setSelectedHero] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = heroCollection
    if (rarityFilter > 0) result = result.filter(h => h.rarity === rarityFilter)
    if (search) result = result.filter(h => h.name.includes(search) || h.faction.includes(search))
    return result
  }, [heroCollection, rarityFilter, search])

  const stats = useMemo(() => ({
    total: heroCollection.length,
    ssr: heroCollection.filter(h => h.rarity === 5).length,
    sr: heroCollection.filter(h => h.rarity === 4).length,
    r: heroCollection.filter(h => h.rarity === 3).length,
  }), [heroCollection])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Stats */}
      <div className="mx-3 mt-2 p-3 bg-gradient-to-r from-slate-800/90 to-slate-900/90 rounded-xl border border-slate-700/40 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-amber-200">武将图鉴</h3>
            <p className="text-xs text-slate-400 mt-0.5">已收集 {stats.total} 位武将</p>
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">{stats.ssr}</div>
              <div className="text-[10px] text-slate-500">SSR</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">{stats.sr}</div>
              <div className="text-[10px] text-slate-500">SR</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-sky-400">{stats.r}</div>
              <div className="text-[10px] text-slate-500">R</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mx-3 mt-2 flex gap-2 flex-shrink-0">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-800/80 rounded-lg border border-slate-700/50">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索武将..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none"
          />
        </div>
        <div className="flex gap-0.5">
          {([0, 5, 4, 3] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                rarityFilter === r
                  ? r === 0 ? 'bg-amber-500 text-white' : r === 5 ? 'bg-amber-500 text-white' : r === 4 ? 'bg-purple-500 text-white' : 'bg-sky-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {r === 0 ? '全部' : getRarityLabel(r)}
            </button>
          ))}
        </div>
      </div>

      {/* View Toggle */}
      <div className="mx-3 mt-2 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-slate-400">{filtered.length} 位武将</span>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Heroes Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {filtered.map((hero, i) => (
              <motion.button
                key={hero.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedHero(hero.id)}
                className={`relative p-2 bg-gradient-to-b rounded-xl border-2 ${getRarityBg(hero.rarity)}`}
              >
                {hero.isNew && (
                  <div className="absolute -top-1 -right-1 px-1 py-0.5 bg-green-500 rounded text-[8px] text-white font-bold">NEW</div>
                )}
                <div className="w-full aspect-[3/4] rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/30 flex items-center justify-center mb-1.5 overflow-hidden">
                  <span className="text-3xl">
                    {hero.rarity === 5 ? '🐉' : hero.rarity === 4 ? '⚔️' : '🛡️'}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-200 truncate text-center">{hero.name}</div>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span className={`text-[10px] font-bold ${getRarityColor(hero.rarity)}`}>{getRarityLabel(hero.rarity)}</span>
                  <span className="text-[10px] text-slate-500">{hero.faction}</span>
                  <span className="text-[10px]">{getElementIcon(hero.element)}</span>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map((hero, i) => (
              <motion.div
                key={hero.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/30 hover:border-amber-500/30 transition-colors cursor-pointer"
                onClick={() => setSelectedHero(hero.id)}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getRarityBg(hero.rarity)} border flex items-center justify-center`}>
                  <span className="text-lg">{hero.rarity === 5 ? '🐉' : hero.rarity === 4 ? '⚔️' : '🛡️'}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-200">{hero.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-xs ${getRarityColor(hero.rarity)}`}>{getRarityLabel(hero.rarity)}</span>
                    <span className="text-xs text-slate-500">{hero.faction}国</span>
                    <span className="text-xs">{getElementIcon(hero.element)}</span>
                  </div>
                </div>
                {hero.isNew && (
                  <span className="px-1.5 py-0.5 bg-green-500/20 rounded text-[10px] text-green-400 font-bold">NEW</span>
                )}
              </motion.div>
            ))}
          </div>
        )}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="text-3xl mb-2">🔍</span>
            <p className="text-sm text-slate-500">未找到匹配的武将</p>
          </div>
        )}
      </div>

      {/* Hero Detail Modal */}
      {selectedHero && (
        <HeroDetailModal heroId={selectedHero} onClose={() => setSelectedHero(null)} />
      )}
    </div>
  )
}

function HeroDetailModal({ heroId, onClose }: { heroId: string; onClose: () => void }) {
  const { heroCollection } = useGameStore()
  const hero = heroCollection.find(h => h.id === heroId)
  if (!hero) return null

  const rarityStars = hero.rarity === 5 ? 5 : hero.rarity === 4 ? 4 : 3

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-2xl sm:rounded-2xl border-t sm:border border-amber-500/30 overflow-hidden`}
      >
        {/* Hero Banner */}
        <div className={`relative h-48 bg-gradient-to-br ${getRarityBg(hero.rarity)} flex items-center justify-center`}>
          <span className="text-6xl">{hero.rarity === 5 ? '🐉' : hero.rarity === 4 ? '⚔️' : '🛡️'}</span>
          {hero.rarity === 5 && (
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-gradient-to-b from-amber-400/10 to-transparent"
            />
          )}
        </div>

        {/* Hero Info */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xl font-bold text-slate-200">{hero.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm font-bold ${getRarityColor(hero.rarity)}`}>{getRarityLabel(hero.rarity)}</span>
                <span className="text-xs text-slate-400">{hero.faction}国</span>
                <span className="text-sm">{getElementIcon(hero.element)}</span>
              </div>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: rarityStars }).map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${hero.rarity === 5 ? 'text-amber-400 fill-amber-400' : hero.rarity === 4 ? 'text-purple-400 fill-purple-400' : 'text-sky-400 fill-sky-400'}`} />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: '攻击', value: hero.rarity * 1800 + Math.floor(Math.random() * 500) },
              { label: '防御', value: hero.rarity * 1200 + Math.floor(Math.random() * 400) },
              { label: '生命', value: hero.rarity * 8000 + Math.floor(Math.random() * 2000) },
              { label: '速度', value: hero.rarity * 100 + Math.floor(Math.random() * 50) },
            ].map((stat) => (
              <div key={stat.label} className="p-2 bg-slate-800/80 rounded-lg">
                <div className="text-[10px] text-slate-500">{stat.label}</div>
                <div className="text-sm font-bold text-amber-300">{formatNumber(stat.value)}</div>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-sm font-medium text-white hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            关闭
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
