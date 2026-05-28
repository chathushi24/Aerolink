variable "environment" {
  type        = string
  description = "Target deployment workspace (dev/prod)"
}

variable "notification_logs_queue_arn" {
  type        = string
  description = "AWS SQS NotificationLogsQueue ARN to trigger the Lambda processor"
}

variable "notifications_table_arn" {
  type        = string
  description = "AWS DynamoDB NotificationsTable ARN to authorize Lambda writes"
}

variable "notifications_table_name" {
  type        = string
  description = "AWS DynamoDB NotificationsTable Name"
}
