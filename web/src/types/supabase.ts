export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    graphql_public: {
        Tables: {
            [_ in never]: never
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            graphql: {
                Args: {
                    operationName?: string
                    query?: string
                    variables?: Json
                    extensions?: Json
                }
                Returns: Json
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
    public: {
        Tables: {
            room_attachments: {
                Row: {
                    created_at: string
                    filename: string | null
                    id: string
                    kind: string
                    mime: string
                    room_id: string
                    size_bytes: number
                    storage_path: string
                    uploader_device_id: string | null
                }
                Insert: {
                    created_at?: string
                    filename?: string | null
                    id?: string
                    kind: string
                    mime: string
                    room_id: string
                    size_bytes: number
                    storage_path: string
                    uploader_device_id?: string | null
                }
                Update: {
                    created_at?: string
                    filename?: string | null
                    id?: string
                    kind?: string
                    mime?: string
                    room_id?: string
                    size_bytes?: number
                    storage_path?: string
                    uploader_device_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "room_attachments_room_id_fkey"
                        columns: ["room_id"]
                        isOneToOne: false
                        referencedRelation: "rooms"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "room_attachments_room_id_fkey"
                        columns: ["room_id"]
                        isOneToOne: false
                        referencedRelation: "room_previews"
                        referencedColumns: ["room_id"]
                    },
                ]
            }
            room_messages: {
                Row: {
                    attachment_id: string | null
                    body: string | null
                    created_at: string
                    id: string
                    kind: string
                    room_id: string
                    sender_device_id: string | null
                    sender_name_snapshot: string
                }
                Insert: {
                    attachment_id?: string | null
                    body?: string | null
                    created_at?: string
                    id?: string
                    kind: string
                    room_id: string
                    sender_device_id?: string | null
                    sender_name_snapshot: string
                }
                Update: {
                    attachment_id?: string | null
                    body?: string | null
                    created_at?: string
                    id?: string
                    kind?: string
                    room_id?: string
                    sender_device_id?: string | null
                    sender_name_snapshot?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "room_messages_room_id_fkey"
                        columns: ["room_id"]
                        isOneToOne: false
                        referencedRelation: "rooms"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "room_messages_room_id_fkey"
                        columns: ["room_id"]
                        isOneToOne: false
                        referencedRelation: "room_previews"
                        referencedColumns: ["room_id"]
                    },
                ]
            }
            room_participants: {
                Row: {
                    device_id: string
                    display_name: string
                    is_banned: boolean
                    joined_at: string
                    last_seen_at: string
                    room_id: string
                }
                Insert: {
                    device_id: string
                    display_name: string
                    is_banned?: boolean
                    joined_at?: string
                    last_seen_at?: string
                    room_id: string
                }
                Update: {
                    device_id?: string
                    display_name?: string
                    is_banned?: boolean
                    joined_at?: string
                    last_seen_at?: string
                    room_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "room_participants_room_id_fkey"
                        columns: ["room_id"]
                        isOneToOne: false
                        referencedRelation: "rooms"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "room_participants_room_id_fkey"
                        columns: ["room_id"]
                        isOneToOne: false
                        referencedRelation: "room_previews"
                        referencedColumns: ["room_id"]
                    },
                ]
            }
            room_todos: {
                Row: {
                    completed: boolean
                    created_at: string
                    created_by_device_id: string | null
                    id: string
                    room_id: string
                    text: string
                }
                Insert: {
                    completed?: boolean
                    created_at?: string
                    created_by_device_id?: string | null
                    id?: string
                    room_id: string
                    text: string
                }
                Update: {
                    completed?: boolean
                    created_at?: string
                    created_by_device_id?: string | null
                    id?: string
                    room_id?: string
                    text?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "room_todos_room_id_fkey"
                        columns: ["room_id"]
                        isOneToOne: false
                        referencedRelation: "rooms"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "room_todos_room_id_fkey"
                        columns: ["room_id"]
                        isOneToOne: false
                        referencedRelation: "room_previews"
                        referencedColumns: ["room_id"]
                    },
                ]
            }
            rooms: {
                Row: {
                    created_at: string
                    expires_at: string
                    id: string
                    join_key_hash: string
                    locked_at: string | null
                    name: string | null
                    owner_device_id: string
                    updated_at: string
                }
                Insert: {
                    created_at?: string
                    expires_at?: string
                    id?: string
                    join_key_hash: string
                    locked_at?: string | null
                    name?: string | null
                    owner_device_id: string
                    updated_at?: string
                }
                Update: {
                    created_at?: string
                    expires_at?: string
                    id?: string
                    join_key_hash?: string
                    locked_at?: string | null
                    name?: string | null
                    owner_device_id?: string
                    updated_at?: string
                }
                Relationships: []
            }
        }
        Views: {
            room_previews: {
                Row: {
                    latest_message: Json | null
                    room_id: string | null
                    room_name: string | null
                    updated_at: string | null
                }
                Relationships: []
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
    ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
