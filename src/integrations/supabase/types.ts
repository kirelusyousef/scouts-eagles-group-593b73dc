export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      App_Settings: {
        Row: {
          Group_Name: string | null
          Logo_URL: string | null
          Setting_ID: string
          Timestamp: string | null
          Updated_By: string | null
        }
        Insert: {
          Group_Name?: string | null
          Logo_URL?: string | null
          Setting_ID: string
          Timestamp?: string | null
          Updated_By?: string | null
        }
        Update: {
          Group_Name?: string | null
          Logo_URL?: string | null
          Setting_ID?: string
          Timestamp?: string | null
          Updated_By?: string | null
        }
        Relationships: []
      }
      Attendance: {
        Row: {
          Activity_Type: string | null
          Attendance_ID: string
          Date: string | null
          Notes: string | null
          Status: string | null
          User_ID: string | null
        }
        Insert: {
          Activity_Type?: string | null
          Attendance_ID: string
          Date?: string | null
          Notes?: string | null
          Status?: string | null
          User_ID?: string | null
        }
        Update: {
          Activity_Type?: string | null
          Attendance_ID?: string
          Date?: string | null
          Notes?: string | null
          Status?: string | null
          User_ID?: string | null
        }
        Relationships: []
      }
      Auto_Notifications_Config: {
        Row: {
          Config_ID: string
          Days_Before: number | null
          Message_Template: string | null
          Timestamp: string | null
          Type: string | null
          Updated_By: string | null
        }
        Insert: {
          Config_ID: string
          Days_Before?: number | null
          Message_Template?: string | null
          Timestamp?: string | null
          Type?: string | null
          Updated_By?: string | null
        }
        Update: {
          Config_ID?: string
          Days_Before?: number | null
          Message_Template?: string | null
          Timestamp?: string | null
          Type?: string | null
          Updated_By?: string | null
        }
        Relationships: []
      }
      Committees: {
        Row: {
          Committee_ID: string
          Committee_Name: string | null
        }
        Insert: {
          Committee_ID: string
          Committee_Name?: string | null
        }
        Update: {
          Committee_ID?: string
          Committee_Name?: string | null
        }
        Relationships: []
      }
      Finance: {
        Row: {
          Amount: number | null
          Date: string | null
          Payment_Status: string | null
          Target_ID: string | null
          Target_Type: string | null
          Title: string | null
          Transaction_ID: string
          User_ID: string | null
        }
        Insert: {
          Amount?: number | null
          Date?: string | null
          Payment_Status?: string | null
          Target_ID?: string | null
          Target_Type?: string | null
          Title?: string | null
          Transaction_ID: string
          User_ID?: string | null
        }
        Update: {
          Amount?: number | null
          Date?: string | null
          Payment_Status?: string | null
          Target_ID?: string | null
          Target_Type?: string | null
          Title?: string | null
          Transaction_ID?: string
          User_ID?: string | null
        }
        Relationships: []
      }
      Financial_Ledger: {
        Row: {
          Amount: number | null
          Ledger_ID: string
          Scope_ID: string | null
          Scope_Type: string | null
          Statement: string | null
          Timestamp: string | null
          Transaction_Type: string | null
          Updated_By: string | null
        }
        Insert: {
          Amount?: number | null
          Ledger_ID: string
          Scope_ID?: string | null
          Scope_Type?: string | null
          Statement?: string | null
          Timestamp?: string | null
          Transaction_Type?: string | null
          Updated_By?: string | null
        }
        Update: {
          Amount?: number | null
          Ledger_ID?: string
          Scope_ID?: string | null
          Scope_Type?: string | null
          Statement?: string | null
          Timestamp?: string | null
          Transaction_Type?: string | null
          Updated_By?: string | null
        }
        Relationships: []
      }
      Group_Events: {
        Row: {
          Budget_Allocated: number | null
          Event_End_Date: string | null
          Event_ID: string
          Event_Name: string | null
          Event_Start_Date: string | null
          Event_Type: string | null
          Leader_In_Charge: string | null
          Staff_List: string | null
        }
        Insert: {
          Budget_Allocated?: number | null
          Event_End_Date?: string | null
          Event_ID: string
          Event_Name?: string | null
          Event_Start_Date?: string | null
          Event_Type?: string | null
          Leader_In_Charge?: string | null
          Staff_List?: string | null
        }
        Update: {
          Budget_Allocated?: number | null
          Event_End_Date?: string | null
          Event_ID?: string
          Event_Name?: string | null
          Event_Start_Date?: string | null
          Event_Type?: string | null
          Leader_In_Charge?: string | null
          Staff_List?: string | null
        }
        Relationships: []
      }
      Group_Info: {
        Row: {
          Facebook_Link: string | null
          ID: string
          Instagram_Link: string | null
          TikTok_Link: string | null
          Timestamp: string | null
          Updated_By: string | null
          WhatsApp_Number: string | null
        }
        Insert: {
          Facebook_Link?: string | null
          ID: string
          Instagram_Link?: string | null
          TikTok_Link?: string | null
          Timestamp?: string | null
          Updated_By?: string | null
          WhatsApp_Number?: string | null
        }
        Update: {
          Facebook_Link?: string | null
          ID?: string
          Instagram_Link?: string | null
          TikTok_Link?: string | null
          Timestamp?: string | null
          Updated_By?: string | null
          WhatsApp_Number?: string | null
        }
        Relationships: []
      }
      Hierarchy_Levels: {
        Row: {
          Level_Name: string | null
          Level_Number: number
        }
        Insert: {
          Level_Name?: string | null
          Level_Number: number
        }
        Update: {
          Level_Name?: string | null
          Level_Number?: number
        }
        Relationships: []
      }
      History_Log: {
        Row: {
          Action_Type: string | null
          Admin_Name: string | null
          Details: string | null
          Log_ID: string
          Timestamp: string | null
          User_ID: string | null
        }
        Insert: {
          Action_Type?: string | null
          Admin_Name?: string | null
          Details?: string | null
          Log_ID: string
          Timestamp?: string | null
          User_ID?: string | null
        }
        Update: {
          Action_Type?: string | null
          Admin_Name?: string | null
          Details?: string | null
          Log_ID?: string
          Timestamp?: string | null
          User_ID?: string | null
        }
        Relationships: []
      }
      Leader_Attendance: {
        Row: {
          Activity_Type: string | null
          Attendance_ID: string
          Date: string | null
          Notes: string | null
          Status: string | null
          User_ID: string | null
        }
        Insert: {
          Activity_Type?: string | null
          Attendance_ID: string
          Date?: string | null
          Notes?: string | null
          Status?: string | null
          User_ID?: string | null
        }
        Update: {
          Activity_Type?: string | null
          Attendance_ID?: string
          Date?: string | null
          Notes?: string | null
          Status?: string | null
          User_ID?: string | null
        }
        Relationships: []
      }
      Leader_Ranks_Tasks: {
        Row: {
          Order_Weight: number | null
          Rank_Name: string | null
          Role_Type: string | null
          Structure_Level: number | null
          Task_Name: string | null
          Task_Rank_ID: string
        }
        Insert: {
          Order_Weight?: number | null
          Rank_Name?: string | null
          Role_Type?: string | null
          Structure_Level?: number | null
          Task_Name?: string | null
          Task_Rank_ID: string
        }
        Update: {
          Order_Weight?: number | null
          Rank_Name?: string | null
          Role_Type?: string | null
          Structure_Level?: number | null
          Task_Name?: string | null
          Task_Rank_ID?: string
        }
        Relationships: []
      }
      Leader_Structure_Rules: {
        Row: {
          Category: string | null
          Level: number | null
          Order_Weight: number | null
          Role_Name: string | null
          Rule_ID: string
        }
        Insert: {
          Category?: string | null
          Level?: number | null
          Order_Weight?: number | null
          Role_Name?: string | null
          Rule_ID: string
        }
        Update: {
          Category?: string | null
          Level?: number | null
          Order_Weight?: number | null
          Role_Name?: string | null
          Rule_ID?: string
        }
        Relationships: []
      }
      Member_Ranks: {
        Row: {
          Rank_ID: string
          Rank_Level: number | null
          Rank_Name: string | null
          Rank_Weight: number | null
        }
        Insert: {
          Rank_ID: string
          Rank_Level?: number | null
          Rank_Name?: string | null
          Rank_Weight?: number | null
        }
        Update: {
          Rank_ID?: string
          Rank_Level?: number | null
          Rank_Name?: string | null
          Rank_Weight?: number | null
        }
        Relationships: []
      }
      News: {
        Row: {
          Content: string | null
          Created_By: string | null
          News_ID: string
          News_Images: string | null
          Timestamp: string | null
          Title: string | null
        }
        Insert: {
          Content?: string | null
          Created_By?: string | null
          News_ID: string
          News_Images?: string | null
          Timestamp?: string | null
          Title?: string | null
        }
        Update: {
          Content?: string | null
          Created_By?: string | null
          News_ID?: string
          News_Images?: string | null
          Timestamp?: string | null
          Title?: string | null
        }
        Relationships: []
      }
      Patrols: {
        Row: {
          Patrol_ID: string
          Patrol_Leader_Name: string | null
          Patrol_Name: string | null
          Team_ID: string | null
          Total_Points: number | null
        }
        Insert: {
          Patrol_ID: string
          Patrol_Leader_Name?: string | null
          Patrol_Name?: string | null
          Team_ID?: string | null
          Total_Points?: number | null
        }
        Update: {
          Patrol_ID?: string
          Patrol_Leader_Name?: string | null
          Patrol_Name?: string | null
          Team_ID?: string | null
          Total_Points?: number | null
        }
        Relationships: []
      }
      Public_Service: {
        Row: {
          Assistant_Leader_Of_Day: string | null
          Evaluation_Data: string | null
          Leader_Of_Day: string | null
          Leaders_List: string | null
          Members_List: string | null
          Reminder_Sent: boolean | null
          Service_Date: string | null
          Service_ID: string
        }
        Insert: {
          Assistant_Leader_Of_Day?: string | null
          Evaluation_Data?: string | null
          Leader_Of_Day?: string | null
          Leaders_List?: string | null
          Members_List?: string | null
          Reminder_Sent?: boolean | null
          Service_Date?: string | null
          Service_ID: string
        }
        Update: {
          Assistant_Leader_Of_Day?: string | null
          Evaluation_Data?: string | null
          Leader_Of_Day?: string | null
          Leaders_List?: string | null
          Members_List?: string | null
          Reminder_Sent?: boolean | null
          Service_Date?: string | null
          Service_ID?: string
        }
        Relationships: []
      }
      Role_Types: {
        Row: {
          Order_Weight: number | null
          Role_Type_ID: string
          Role_Type_Name: string | null
        }
        Insert: {
          Order_Weight?: number | null
          Role_Type_ID: string
          Role_Type_Name?: string | null
        }
        Update: {
          Order_Weight?: number | null
          Role_Type_ID?: string
          Role_Type_Name?: string | null
        }
        Relationships: []
      }
      Sub_Group_Types: {
        Row: {
          Sub_Group_ID: string
          Sub_Group_Name: string | null
          Team_Type: string | null
        }
        Insert: {
          Sub_Group_ID: string
          Sub_Group_Name?: string | null
          Team_Type?: string | null
        }
        Update: {
          Sub_Group_ID?: string
          Sub_Group_Name?: string | null
          Team_Type?: string | null
        }
        Relationships: []
      }
      Teams: {
        Row: {
          Leader_In_Charge: string | null
          Order_Weight: number
          Team_ID: string
          Team_Name: string | null
        }
        Insert: {
          Leader_In_Charge?: string | null
          Order_Weight?: number
          Team_ID: string
          Team_Name?: string | null
        }
        Update: {
          Leader_In_Charge?: string | null
          Order_Weight?: number
          Team_ID?: string
          Team_Name?: string | null
        }
        Relationships: []
      }
      User_Certificates: {
        Row: {
          Certificate_ID: string
          Course_Name: string | null
          Course_Type: string | null
          End_Date: string | null
          Notes: string | null
          Provider: string | null
          Start_Date: string | null
          User_ID: string | null
        }
        Insert: {
          Certificate_ID: string
          Course_Name?: string | null
          Course_Type?: string | null
          End_Date?: string | null
          Notes?: string | null
          Provider?: string | null
          Start_Date?: string | null
          User_ID?: string | null
        }
        Update: {
          Certificate_ID?: string
          Course_Name?: string | null
          Course_Type?: string | null
          End_Date?: string | null
          Notes?: string | null
          Provider?: string | null
          Start_Date?: string | null
          User_ID?: string | null
        }
        Relationships: []
      }
      User_Notifications: {
        Row: {
          Body: string | null
          Created_At: string | null
          Is_Read: string | null
          Notification_ID: string
          Opened_At: string | null
          Reference_ID: string | null
          Source: string | null
          Title: string | null
          User_ID: string | null
        }
        Insert: {
          Body?: string | null
          Created_At?: string | null
          Is_Read?: string | null
          Notification_ID: string
          Opened_At?: string | null
          Reference_ID?: string | null
          Source?: string | null
          Title?: string | null
          User_ID?: string | null
        }
        Update: {
          Body?: string | null
          Created_At?: string | null
          Is_Read?: string | null
          Notification_ID?: string
          Opened_At?: string | null
          Reference_ID?: string | null
          Source?: string | null
          Title?: string | null
          User_ID?: string | null
        }
        Relationships: []
      }
      Users: {
        Row: {
          Birth_Certificate: string | null
          Birth_Date: string | null
          Committee_ID: string | null
          Committee_Role_ID: string | null
          Confession_Father: string | null
          Education_Stage: string | null
          Email: string | null
          Father_Name: string | null
          First_Name: string | null
          Gender: string | null
          Grandfather_Name: string | null
          Has_WhatsApp: boolean | null
          ID: string
          Is_Skipped: string | null
          Last_Name: string | null
          Leader_Rank_ID: string | null
          National_ID: string | null
          National_ID_Back: string | null
          National_ID_Front: string | null
          Parent_Phone: string | null
          Password: string | null
          Patrol_ID: string | null
          Phone: string | null
          Profile_Photo: string | null
          Rank: string | null
          Reset_Phone: string | null
          Reset_Requested: string | null
          Role: string | null
          Status: string | null
          Team_ID: string | null
          Team_Role_ID: string | null
          User_Type: string | null
          Visible_Screens: string | null
        }
        Insert: {
          Birth_Certificate?: string | null
          Birth_Date?: string | null
          Committee_ID?: string | null
          Committee_Role_ID?: string | null
          Confession_Father?: string | null
          Education_Stage?: string | null
          Email?: string | null
          Father_Name?: string | null
          First_Name?: string | null
          Gender?: string | null
          Grandfather_Name?: string | null
          Has_WhatsApp?: boolean | null
          ID: string
          Is_Skipped?: string | null
          Last_Name?: string | null
          Leader_Rank_ID?: string | null
          National_ID?: string | null
          National_ID_Back?: string | null
          National_ID_Front?: string | null
          Parent_Phone?: string | null
          Password?: string | null
          Patrol_ID?: string | null
          Phone?: string | null
          Profile_Photo?: string | null
          Rank?: string | null
          Reset_Phone?: string | null
          Reset_Requested?: string | null
          Role?: string | null
          Status?: string | null
          Team_ID?: string | null
          Team_Role_ID?: string | null
          User_Type?: string | null
          Visible_Screens?: string | null
        }
        Update: {
          Birth_Certificate?: string | null
          Birth_Date?: string | null
          Committee_ID?: string | null
          Committee_Role_ID?: string | null
          Confession_Father?: string | null
          Education_Stage?: string | null
          Email?: string | null
          Father_Name?: string | null
          First_Name?: string | null
          Gender?: string | null
          Grandfather_Name?: string | null
          Has_WhatsApp?: boolean | null
          ID?: string
          Is_Skipped?: string | null
          Last_Name?: string | null
          Leader_Rank_ID?: string | null
          National_ID?: string | null
          National_ID_Back?: string | null
          National_ID_Front?: string | null
          Parent_Phone?: string | null
          Password?: string | null
          Patrol_ID?: string | null
          Phone?: string | null
          Profile_Photo?: string | null
          Rank?: string | null
          Reset_Phone?: string | null
          Reset_Requested?: string | null
          Role?: string | null
          Status?: string | null
          Team_ID?: string | null
          Team_Role_ID?: string | null
          User_Type?: string | null
          Visible_Screens?: string | null
        }
        Relationships: []
      }
      Vision_Mission: {
        Row: {
          Content: string | null
          ID: string
          Timestamp: string | null
          Type: string | null
          Updated_By: string | null
        }
        Insert: {
          Content?: string | null
          ID: string
          Timestamp?: string | null
          Type?: string | null
          Updated_By?: string | null
        }
        Update: {
          Content?: string | null
          ID?: string
          Timestamp?: string | null
          Type?: string | null
          Updated_By?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
