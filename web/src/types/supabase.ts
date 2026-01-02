export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            rooms: {
                Row: {
                    id: string
                    name: string | null
                    owner_device_id: string
                    join_key_hash: string
                    expires_at: string
                    locked_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name?: string | null
                    owner_device_id: string
                    join_key_hash: string
                    expires_at?: string
                    locked_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string | null
                    owner_device_id?: string
                    join_key_hash?: string
                    expires_at?: string
                    locked_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            },
            room_participants: {
                Row: {
                    room_id: string
                    device_id: string
                    display_name: string
                    is_banned: boolean
                    joined_at: string
                    last_seen_at: string
                }
                Insert: {
                    room_id: string
                    device_id: string
                    display_name: string
                    is_banned?: boolean
                    joined_at?: string
                    last_seen_at?: string
                }
                Update: {
                    room_id?: string
                    device_id?: string
                    display_name?: string
                    is_banned?: boolean
                    joined_at?: string
                    last_seen_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "room_participants_room_id_fkey"
                        columns: ["room_id"]
                        referencedRelation: "rooms"
                        referencedColumns: ["id"]
                    }
                ]
            },
            room_messages: {
                Row: {
                    id: string
                    room_id: string
                    sender_device_id: string | null
                    sender_name_snapshot: string
                    kind: 'text' | 'image' | 'video' | 'file'
                    body: string | null
                    attachment_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    room_id: string
                    sender_device_id?: string | null
                    sender_name_snapshot: string
                    kind: 'text' | 'image' | 'video' | 'file'
                    body?: string | null
                    attachment_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    room_id?: string
                    sender_device_id?: string | null
                    sender_name_snapshot?: string
                    kind?: 'text' | 'image' | 'video' | 'file'
                    body?: string | null
                    attachment_id?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "room_messages_room_id_fkey"
                        columns: ["room_id"]
                        referencedRelation: "rooms"
                        referencedColumns: ["id"]
                    }
                ]
            },
            room_attachments: {
                Row: {
                    id: string
                    room_id: string
                    uploader_device_id: string | null
                    kind: 'image' | 'video' | 'file'
                    storage_path: string
                    mime: string
                    size_bytes: number
                    filename: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    room_id: string
                    uploader_device_id?: string | null
                    kind: 'image' | 'video' | 'file'
                    storage_path: string
                    mime: string
                    size_bytes: number
                    filename?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    room_id?: string
                    uploader_device_id?: string | null
                    kind?: 'image' | 'video' | 'file'
                    storage_path?: string
                    mime?: string
                    size_bytes?: number
                    filename?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "room_attachments_room_id_fkey"
                        columns: ["room_id"]
                        referencedRelation: "rooms"
                        referencedColumns: ["id"]
                    }
                ]
            },
            room_todos: {
                Row: {
                    id: string
                    room_id: string
                    text: string
                    completed: boolean
                    created_at: string
                    created_by_device_id: string | null
                }
                Insert: {
                    id?: string
                    room_id: string
                    text: string
                    completed?: boolean
                    created_at?: string
                    created_by_device_id?: string | null
                }
                Update: {
                    id?: string
                    room_id?: string
                    text?: string
                    completed?: boolean
                    created_at?: string
                    created_by_device_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "room_todos_room_id_fkey"
                        columns: ["room_id"]
                        referencedRelation: "rooms"
                        referencedColumns: ["id"]
                    }
                ]
            }
        },
        Views: {
            room_previews: {
                Row: {
                    room_id: string
                    room_name: string | null
                    updated_at: string
                    latest_message: {
                        kind: 'text' | 'image' | 'video' | 'file'
                        body: string | null
                        created_at: string
                        sender_name: string
                    } | null
                }
            }
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
