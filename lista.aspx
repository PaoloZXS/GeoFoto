<%@ Page Language="C#" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Linq" %>
<script runat="server">
    protected void Page_Load(object sender, EventArgs e)
    {
        Response.ContentType = "application/json";
        try
        {
            string dir = @"C:\FotoCampiSolari";
            if (!Directory.Exists(dir))
            {
                Response.Write("[]");
                return;
            }
            var cartelle = Directory.GetDirectories(dir)
                .Select(d => Path.GetFileName(d))
                .OrderBy(n => n)
                .ToArray();
            var json = "[" + string.Join(",", cartelle.Select(c => "\"" + c.Replace("\"", "\\\"") + "\"")) + "]";
            Response.Write(json);
        }
        catch
        {
            Response.Write("[]");
        }
    }
</script>
