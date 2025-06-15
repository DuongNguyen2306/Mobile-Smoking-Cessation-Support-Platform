// Utility functions for time formatting
export const getTimeAgo = (timestamp) => {
  if (!timestamp) return ""

  const now = new Date()
  const time = new Date(timestamp)
  const diffMs = now - time

  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffSeconds < 60) return "vừa xong"
  if (diffMinutes < 60) return `${diffMinutes} phút`
  if (diffHours < 24) return `${diffHours} giờ`
  if (diffDays < 7) return `${diffDays} ngày`

  return time.toLocaleDateString("vi-VN")
}

export const formatLastSeen = (timestamp) => {
  if (!timestamp) return "Chưa xác định"

  const timeAgo = getTimeAgo(timestamp)
  return timeAgo === "vừa xong" ? "Đang hoạt động" : `Hoạt động ${timeAgo} trước`
}

export const isRecentlyOnline = (timestamp) => {
  if (!timestamp) return false

  const now = new Date()
  const time = new Date(timestamp)
  const diffMinutes = Math.floor((now - time) / 60000)

  return diffMinutes <= 5 // Coi như online nếu hoạt động trong 5 phút qua
}

// Cải thiện logic kiểm tra online status
export const isUserOnline = (userStatus) => {
  if (!userStatus) return false

  // Nếu có flag online từ socket và thời gian gần đây
  if (userStatus.online && isRecentlyOnline(userStatus.lastSeen || userStatus.timestamp)) {
    return true
  }

  // Nếu không có flag online nhưng lastSeen rất gần đây (trong 2 phút)
  if (!userStatus.online && userStatus.lastSeen) {
    const now = new Date()
    const lastSeen = new Date(userStatus.lastSeen)
    const diffMinutes = Math.floor((now - lastSeen) / 60000)
    return diffMinutes <= 2
  }

  return false
}

// Format thời gian cho tin nhắn
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return ""

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays > 6) {
    // Hơn 1 tuần: hiển thị ngày/tháng/năm
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })
  } else if (diffDays > 0) {
    // Trong tuần: hiển thị ngày/tháng
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    })
  } else if (diffHours > 0) {
    // Trong ngày: hiển thị số giờ
    return `${diffHours}h`
  } else {
    // Trong giờ: hiển thị giờ:phút
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
}
