#!/bin/bash

# ============================================
# BHARATOS PRODUCTION HEALTH CHECK
# ============================================
# Automated health monitoring for multi-tenant SaaS
# Checks system status, performance, and alerts on issues

set -e

# Configuration
SERVER_URL=${SERVER_URL:-"http://localhost:3000"}
LOG_FILE="./logs/health_check_$(date +%Y%m%d).log"
THRESHOLD_RESPONSE_TIME=1000  # ms
THRESHOLD_ERROR_RATE=5        # %

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Check server health
check_server_health() {
    log "Checking server health..."

    local response=$(curl -s -w "HTTPSTATUS:%{http_code};RESPONSETIME:%{time_total}" "$SERVER_URL/health" 2>/dev/null)
    local body=$(echo "$response" | sed 's/HTTPSTATUS.*//')
    local status=$(echo "$response" | sed 's/.*HTTPSTATUS:\([0-9]*\).*/\1/')
    local time=$(echo "$response" | sed 's/.*RESPONSETIME:\([0-9.]*\).*/\1/')

    if [[ "$status" != "200" ]]; then
        error "Server health check failed! Status: $status"
        return 1
    fi

    local response_time_ms=$(echo "$time * 1000" | bc 2>/dev/null || echo "0")
    if (( $(echo "$response_time_ms > $THRESHOLD_RESPONSE_TIME" | bc -l 2>/dev/null || echo "0") )); then
        warning "Slow health check response: ${response_time_ms}ms"
    else
        success "Server health OK (${response_time_ms}ms)"
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."

    # Try to get district count (lightweight query)
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$SERVER_URL/api/districts" 2>/dev/null)
    local status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)

    if [[ "$status" != "200" ]]; then
        error "Database connectivity check failed! Status: $status"
        return 1
    fi

    success "Database connectivity OK"
}

# Check multi-tenancy isolation
check_multi_tenancy() {
    log "Checking multi-tenancy isolation..."

    # Try accessing shahdol data
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$SERVER_URL/api/stores?district=shahdol" 2>/dev/null)
    local status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)

    if [[ "$status" != "200" ]]; then
        error "Multi-tenancy check failed! Status: $status"
        return 1
    fi

    success "Multi-tenancy isolation OK"
}

# Check error rate from logs
check_error_rate() {
    log "Checking error rate from logs..."

    local log_file="./logs/bharatos-$(date +%Y%m%d).log"
    if [[ ! -f "$log_file" ]]; then
        warning "No log file found for today"
        return 0
    fi

    local total_requests=$(grep -c "\[INFO\].*Request completed" "$log_file" 2>/dev/null || echo "0")
    local error_requests=$(grep -c "\[ERROR\]" "$log_file" 2>/dev/null || echo "0")

    if [[ "$total_requests" -eq 0 ]]; then
        log "No requests logged yet"
        return 0
    fi

    local error_rate=$((error_requests * 100 / total_requests))

    if [[ "$error_rate" -gt "$THRESHOLD_ERROR_RATE" ]]; then
        error "High error rate detected: ${error_rate}% ($error_requests/$total_requests)"
        return 1
    fi

    success "Error rate OK: ${error_rate}%"
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."

    # Check disk space (should have >1GB free)
    local disk_free=$(df / | tail -1 | awk '{print $4}')
    if [[ "$disk_free" -lt 1048576 ]]; then # 1GB in KB
        warning "Low disk space: $(($disk_free / 1024))MB free"
    fi

    # Check memory usage
    local mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [[ "$mem_usage" -gt 90 ]]; then
        warning "High memory usage: ${mem_usage}%"
    fi

    success "System resources OK"
}

# Performance test with light load
performance_test() {
    log "Running light performance test..."

    # Simple concurrent requests test
    local concurrent=5
    local total_requests=20

    local start_time=$(date +%s%3N)
    local results=$(seq 1 "$total_requests" | xargs -n1 -P"$concurrent" -I{} curl -s -w "%{time_total}\n" -o /dev/null "$SERVER_URL/health" 2>/dev/null || echo "0")

    local end_time=$(date +%s%3N)
    local total_time=$((end_time - start_time))

    local avg_response_time=$(echo "$results" | awk '{sum+=$1; count++} END {if(count>0) printf "%.0f", (sum/count)*1000; else print "0"}')

    if [[ "$avg_response_time" -gt "$THRESHOLD_RESPONSE_TIME" ]]; then
        warning "Slow average response time: ${avg_response_time}ms"
    else
        success "Performance OK (avg: ${avg_response_time}ms for $total_requests requests)"
    fi
}

# Send alert (placeholder - integrate with your alerting system)
send_alert() {
    local message="$1"
    local severity="${2:-warning}"

    # In production, integrate with Slack, email, PagerDuty, etc.
    echo "🚨 [$severity] $message" | tee -a "$LOG_FILE"

    # Example: Send to Slack webhook
    # curl -X POST -H 'Content-type: application/json' --data "{\"text\":\"🚨 BharatOS Alert: $message\"}" "$SLACK_WEBHOOK_URL"
}

# Main execution
main() {
    log "🩺 Starting BharatOS Health Check"
    log "================================="

    local failed_checks=0

    if ! check_server_health; then
        ((failed_checks++))
        send_alert "Server health check failed" "critical"
    fi

    if ! check_database; then
        ((failed_checks++))
        send_alert "Database connectivity check failed" "critical"
    fi

    if ! check_multi_tenancy; then
        ((failed_checks++))
        send_alert "Multi-tenancy isolation check failed" "critical"
    fi

    if ! check_error_rate; then
        ((failed_checks++))
        send_alert "High error rate detected" "warning"
    fi

    check_system_resources
    performance_test

    log "================================="
    if [[ "$failed_checks" -eq 0 ]]; then
        success "✅ All health checks passed!"
        exit 0
    else
        error "❌ $failed_checks health checks failed!"
        exit 1
    fi
}

# Run main function
main "$@"