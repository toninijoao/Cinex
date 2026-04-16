'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import { UserIcon, CheckIcon } from '@/components/ui/Icons'

interface FollowButtonProps {
  targetUserId: string
  initialIsFollowing?: boolean
  className?: string
}

export default function FollowButton({ targetUserId, initialIsFollowing = false, className = '' }: FollowButtonProps) {
  const supabase = createClient()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    async function checkStatus() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setCurrentUserId(user.id)

      if (user.id === targetUserId) {
        setLoading(false)
        return // Can't follow yourself
      }

      const { data } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single()

      if (data) setIsFollowing(true)
      setLoading(false)
    }

    checkStatus()
  }, [targetUserId, supabase])

  const toggleFollow = async () => {
    if (!currentUserId) {
      alert("Você precisa estar logado para seguir usuários.")
      return
    }

    setLoading(true)
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId)
        setIsFollowing(false)
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: targetUserId
          })
          
        // Create notification for target user
        await supabase
          .from('notifications')
          .insert({
            user_id: targetUserId,
            actor_id: currentUserId,
            type: 'new_follower'
          })

        setIsFollowing(true)
      }
    } catch (err) {
      console.error("Error toggling follow:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!currentUserId || currentUserId === targetUserId) return null

  return (
    <Button 
      variant={isFollowing ? 'secondary' : 'primary'} 
      size="sm" 
      onClick={toggleFollow}
      loading={loading}
      className={className}
      style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
    >
      {isFollowing ? (
        <>
          <CheckIcon size={14} /> Seguindo
        </>
      ) : (
        <>
          <UserIcon size={14} /> Seguir
        </>
      )}
    </Button>
  )
}
