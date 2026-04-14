'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  Settings,
  FileJson,
  File,
  Search,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { TreeNode } from '@/lib/project-data'

interface DirectoryTreeProps {
  data: TreeNode
  title: string
  accentColor?: string
}

const getFileIcon = (name: string) => {
  if (name.endsWith('.go')) return <FileCode className="w-4 h-4 text-cyan-500" />
  if (name.endsWith('.proto')) return <FileText className="w-4 h-4 text-purple-500" />
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return <FileJson className="w-4 h-4 text-amber-500" />
  if (name.endsWith('.cs')) return <FileCode className="w-4 h-4 text-green-500" />
  if (name.endsWith('.json')) return <FileJson className="w-4 h-4 text-yellow-500" />
  if (name.endsWith('.unity')) return <FileText className="w-4 h-4 text-blue-400" />
  if (name.endsWith('.prefab')) return <FileText className="w-4 h-4 text-indigo-400" />
  if (name.endsWith('.shader')) return <FileText className="w-4 h-4 text-pink-400" />
  if (name.endsWith('.md')) return <FileText className="w-4 h-4 text-slate-500" />
  if (name.endsWith('.sh')) return <Settings className="w-4 h-4 text-orange-500" />
  if (name === 'Dockerfile' || name === 'Makefile') return <Settings className="w-4 h-4 text-sky-500" />
  if (name === 'go.mod' || name === 'go.sum') return <FileJson className="w-4 h-4 text-sky-600" />
  return <File className="w-4 h-4 text-muted-foreground" />
}

const getFileColor = (name: string) => {
  if (name.endsWith('.go')) return 'text-cyan-600 dark:text-cyan-400'
  if (name.endsWith('.proto')) return 'text-purple-600 dark:text-purple-400'
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return 'text-amber-600 dark:text-amber-400'
  if (name.endsWith('.cs')) return 'text-green-600 dark:text-green-400'
  if (name.endsWith('.json')) return 'text-yellow-600 dark:text-yellow-400'
  if (name.endsWith('.unity')) return 'text-blue-500 dark:text-blue-400'
  if (name.endsWith('.prefab')) return 'text-indigo-500 dark:text-indigo-400'
  if (name.endsWith('.shader')) return 'text-pink-500 dark:text-pink-400'
  return 'text-muted-foreground'
}

interface TreeItemProps {
  node: TreeNode
  level: number
  searchQuery: string
}

function countChildren(node: TreeNode): number {
  if (!node.children) return 0
  let count = node.children.length
  node.children.forEach((child) => {
    count += countChildren(child)
  })
  return count
}

function TreeItem({ node, level, searchQuery }: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(level < 2)
  const isFolder = node.type === 'folder'
  const hasChildren = isFolder && node.children && node.children.length > 0

  const matchesSearch = searchQuery === '' ||
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.description && node.description.toLowerCase().includes(searchQuery.toLowerCase()))

  const childrenMatch = searchQuery !== '' && isFolder && node.children?.some(
    (child) => childMatchesSearch(child, searchQuery)
  )

  if (searchQuery !== '' && !matchesSearch && !childrenMatch) return null

  const shouldAutoOpen = searchQuery !== '' && childrenMatch

  return (
    <div>
      <motion.div
        initial={false}
        animate={{ opacity: 1, x: 0 }}
        className="group flex items-start gap-1.5 py-[3px] px-1 rounded-md hover:bg-accent/50 transition-colors cursor-default"
        style={{ paddingLeft: `${level * 16 + 4}px` }}
      >
        {hasChildren && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="mt-0.5 flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-accent transition-colors"
          >
            <ChevronRight
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                (isOpen || shouldAutoOpen) ? 'rotate-90' : ''
              }`}
            />
          </button>
        )}
        {!hasChildren && <span className="w-4 flex-shrink-0" />}

        {isFolder ? (
          <FolderOpen className={`w-4 h-4 mt-0.5 flex-shrink-0 ${level === 0 ? 'text-amber-500' : 'text-amber-400 dark:text-amber-500'}`} />
        ) : (
          <span className="mt-0.5 flex-shrink-0">{getFileIcon(node.name)}</span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${level === 0 ? 'text-foreground' : getFileColor(node.name)}`}>
              {highlightMatch(node.name, searchQuery)}
            </span>
            {isFolder && node.children && (
              <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                {node.children.length}项
              </span>
            )}
          </div>
          {node.description && (
            <p className="text-xs text-muted-foreground/70 truncate leading-tight mt-0.5">
              {highlightMatch(node.description, searchQuery)}
            </p>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {(isOpen || shouldAutoOpen) && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {node.children!.map((child, index) => (
              <TreeItem key={`${child.name}-${index}`} node={child} level={level + 1} searchQuery={searchQuery} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function childMatchesSearch(node: TreeNode, query: string): boolean {
  if (node.name.toLowerCase().includes(query.toLowerCase())) return true
  if (node.description?.toLowerCase().includes(query.toLowerCase())) return true
  return node.children?.some((c) => childMatchesSearch(c, query)) ?? false
}

function highlightMatch(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-300 dark:bg-yellow-600 text-foreground rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function DirectoryTree({ data, title, accentColor = 'text-amber-500' }: DirectoryTreeProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const stats = {
    folders: countFolders(data),
    files: countFiles(data),
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className={`text-lg font-bold ${accentColor}`}>{title}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Folder className="w-3 h-3" />
              {stats.folders} 文件夹
            </span>
            <span className="flex items-center gap-1">
              <File className="w-3 h-3" />
              {stats.files} 文件
            </span>
          </div>
        </div>
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      <div className="rounded-lg border bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto p-2 scrollbar-thin">
          <TreeItem node={data} level={0} searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  )
}

function countFolders(node: TreeNode): number {
  let count = node.type === 'folder' ? 1 : 0
  node.children?.forEach((c) => { count += countFolders(c) })
  return count
}

function countFiles(node: TreeNode): number {
  let count = node.type === 'file' ? 1 : 0
  node.children?.forEach((c) => { count += countFiles(c) })
  return count
}
